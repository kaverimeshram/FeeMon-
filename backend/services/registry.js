import cron from 'node-cron';
import { formatEther } from 'viem';
import { publicClient, walletClient } from '../viem.js';
import { REGISTRY_ADDRESS } from '../config.js';
import { REGISTRY_ABI } from '../abis.js';
import * as db from '../db.js';

let latestBlockTime = Date.now();

// Sync logic from chain to database
export const syncRegistry = async () => {
  console.log('[Registry] Starting validator synchronization...');
  try {
    try {
      const latestBlock = await publicClient.getBlock();
      latestBlockTime = Number(latestBlock.timestamp) * 1000;
    } catch (blockErr) {
      console.warn('[Registry] Failed to fetch block time for global sync:', blockErr.message);
    }

    // 1. Get active validator IDs from chain
    const activeIds = await publicClient.readContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'getActiveValidators',
    });

    if (!activeIds || activeIds.length === 0) {
      console.log('[Registry] No validators registered on-chain yet');
      const database = db.getDB();
      database.data.validators = {};
      await database.write();
      return;
    }

    console.log(`[Registry] Found ${activeIds.length} active validator IDs on-chain.`);
    const activeSet = new Set(activeIds.map(id => id.toString()));

    // 2. Fetch details for each active validator
    for (const id of activeIds) {
      try {
        const valData = await publicClient.readContract({
          address: REGISTRY_ADDRESS,
          abi: REGISTRY_ABI,
          functionName: 'getValidator',
          args: [id],
        });

        // Map viem response (handles both object and array formats)
        const validatorId = valData.validatorId !== undefined ? valData.validatorId : valData[0];
        const authAddress = valData.authAddress !== undefined ? valData.authAddress : valData[1];
        const minFeeShareBps = valData.minFeeShareBps !== undefined ? valData.minFeeShareBps : valData[2];
        const totalShared = valData.totalShared !== undefined ? valData.totalShared : valData[3];
        const lastShareTimestamp = valData.lastShareTimestamp !== undefined ? valData.lastShareTimestamp : valData[4];
        const shareCount = valData.shareCount !== undefined ? valData.shareCount : valData[5];
        const active = valData.active !== undefined ? valData.active : valData[6];
        const registeredAt = valData.registeredAt !== undefined ? valData.registeredAt : valData[7];

        // Map and format timestamps
        const lastShareTime = lastShareTimestamp > 0n 
          ? new Date(Number(lastShareTimestamp) * 1000).toISOString() 
          : null;

        const regTime = registeredAt > 0n 
          ? new Date(Number(registeredAt) * 1000).toISOString() 
          : new Date().toISOString();

        await db.upsertValidator({
          validatorId: Number(validatorId),
          authAddress,
          minFeeShareBps: Number(minFeeShareBps),
          totalShared: formatEther(totalShared),
          shareCount: Number(shareCount),
          lastShareTimestamp: lastShareTime,
          active: active,
          registeredAt: regTime
        });
      } catch (valErr) {
        console.error(`[Registry] Failed to fetch validator details for ID ${id}:`, valErr.message);
      }
    }

    // 3. Mark validators inactive in DB if not in the active on-chain list
    const allDbValidators = db.getValidators();
    for (const dbVal of allDbValidators) {
      if (!activeSet.has(dbVal.id.toString()) && dbVal.active) {
        console.log(`[Registry] Validator ${dbVal.id} is no longer active on-chain, marking inactive.`);
        await db.upsertValidator({
          validatorId: dbVal.id,
          active: false
        });
      }
    }

    // 4. Inactivity check and deactivation
    await checkInactivity();

    console.log(`[Registry] Synchronization complete. ${db.getValidators().length} total validators stored.`);
  } catch (err) {
    console.error('[Registry] Failed to sync registry from Monad chain:', err.message);
  }
};

// Check for inactive validators and call deactivate() on contract if needed
const checkInactivity = async () => {
  const now = latestBlockTime;
  const dbValidators = db.getValidators();
  const SIX_HOURS = 6 * 60 * 60 * 1000;

  for (const val of dbValidators) {
    // Skip auto-deactivation for hackathon demo stability
    if (true) continue;
    if (!val.active) continue;

    const lastSharedTime = val.lastShareTimestamp ? Date.parse(val.lastShareTimestamp) : Date.parse(val.registeredAt);
    const timeSinceLastShare = now - lastSharedTime;

    if (timeSinceLastShare > SIX_HOURS) {
      console.log(`[Registry] Validator ${val.id} has not shared fees for > 6 hours. Attempting deactivation...`);
      
      try {
        if (walletClient) {
          const hash = await walletClient.writeContract({
            address: REGISTRY_ADDRESS,
            abi: REGISTRY_ABI,
            functionName: 'deactivate',
            args: [BigInt(val.id)],
          });
          console.log(`[Registry] Deactivation tx submitted for Validator ${val.id}: ${hash}`);
        } else {
          console.log(`[Registry] Keeper not configured, skipping write to deactivate Validator ${val.id}.`);
        }

        // Add alert in DB
        await db.addAlert({
          type: 'INACTIVITY',
          validatorId: val.id,
          timestamp: new Date().toISOString()
        });

        // Set validator active status to false in local DB
        await db.upsertValidator({
          validatorId: val.id,
          active: false
        });

        console.log(`[Registry] Validator ${val.id} deactivated for inactivity`);
      } catch (err) {
        console.error(`[Registry] Failed to deactivate Validator ${val.id} on-chain:`, err.message);
      }
    }
  }
};

// Export registry leaderboards helper
export const getLeaderboard = () => {
  const now = latestBlockTime;
  const list = db.getValidators();

  const enriched = list.map(val => {
    let hoursAgo = 0;
    if (val.lastShareTimestamp) {
      hoursAgo = Number(((now - Date.parse(val.lastShareTimestamp)) / 3600000).toFixed(2));
    } else {
      // If never shared, use registered time
      hoursAgo = Number(((now - Date.parse(val.registeredAt)) / 3600000).toFixed(2));
    }

    let status = 'active';
    if (!val.active) {
      status = 'inactive';
    } else if (hoursAgo > 4) {
      status = 'at_risk';
    }

    return {
      ...val,
      hoursAgo,
      status
    };
  });

  // Sort: active (including at_risk) first, then by feeSharePct descending
  return enriched.sort((a, b) => {
    if (a.active !== b.active) {
      return a.active ? -1 : 1;
    }
    return b.feeSharePct - a.feeSharePct;
  });
};

export const startRegistrySync = () => {
  console.log('[Registry] Sync cron scheduled: every 5 minutes.');
  // Run once immediately on startup
  syncRegistry();
  // Schedule cron for every 5 minutes
  cron.schedule('*/5 * * * *', syncRegistry);
};

