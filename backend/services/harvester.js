import cron from 'node-cron';
import { formatEther } from 'viem';
import { publicClient, walletClient } from '../viem.js';
import { FEEMON_ADDRESS, FMON_ADDRESS } from '../config.js';
import { FEEMON_ABI, FMON_ABI } from '../abis.js';
import * as db from '../db.js';

// Read stats helper with built-in retry
const readStats = async () => {
  if (!FEEMON_ADDRESS || FEEMON_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('FeeMON contract address not configured.');
  }

  const [rate, totalStaked, supply] = await Promise.all([
    publicClient.readContract({
      address: FEEMON_ADDRESS,
      abi: FEEMON_ABI,
      functionName: 'exchangeRate',
    }),
    publicClient.readContract({
      address: FEEMON_ADDRESS,
      abi: FEEMON_ABI,
      functionName: 'totalMONManaged',
    }),
    publicClient.readContract({
      address: FMON_ADDRESS,
      abi: FMON_ABI,
      functionName: 'totalSupply',
    })
  ]);

  return {
    exchangeRate: parseFloat(formatEther(rate)),
    totalMONManaged: parseFloat(formatEther(totalStaked)),
    fmonSupply: parseFloat(formatEther(supply))
  };
};

const readStatsWithRetry = async () => {
  try {
    return await readStats();
  } catch (err) {
    console.warn('[Harvester] RPC stats call failed, retrying in 5 seconds...', err.message);
    await new Promise(resolve => setTimeout(resolve, 5000));
    return await readStats();
  }
};

// Main function to update database protocol stats
export const updateProtocolStats = async () => {
  try {
    const stats = await readStatsWithRetry();
    await db.updateProtocolStats(stats);

    // Fetch latest Harvested event to cache timestamp
    try {
      const latestBlockBig = await publicClient.getBlockNumber();
      const latestBlock = Number(latestBlockBig);
      const fromBlock = BigInt(Math.max(0, latestBlock - 90));
      
      const logs = await publicClient.getLogs({
        address: FEEMON_ADDRESS,
        event: {
          type: 'event',
          name: 'Harvested',
          inputs: [
            { type: 'address', name: 'keeper', indexed: true },
            { type: 'uint256', name: 'rewardAmount' }
          ]
        },
        fromBlock,
        toBlock: 'latest'
      });
      if (logs.length > 0) {
        const latestLog = logs[logs.length - 1];
        const block = await publicClient.getBlock({ blockNumber: latestLog.blockNumber });
        const ts = new Date(Number(block.timestamp) * 1000).toISOString();
        const database = db.getDB();
        database.data.meta.lastHarvestTimestamp = ts;
        await database.write();
      }
    } catch (logErr) {
      console.warn('[Harvester] Failed to query latest Harvested timestamp:', logErr.message);
    }

    console.log(`[Harvester] Stats updated. Rate: ${stats.exchangeRate.toFixed(4)}, TVL: ${stats.totalMONManaged.toFixed(2)} MON`);
  } catch (err) {
    console.error('[Harvester] Failed to update protocol stats:', err.message);
  }
};

// Staking compound harvester trigger
export const harvest = async () => {
  if (process.env.SEED_TEST_DATA === 'true') {
    console.log('[Harvester] SEED_TEST_DATA is true, skipping harvest write transaction.');
    return;
  }

  if (!FEEMON_ADDRESS || FEEMON_ADDRESS === '0x0000000000000000000000000000000000000000') {
    console.log('[Harvester] FeeMON address not set, skipping harvest.');
    return;
  }

  if (!walletClient) {
    console.log('[Harvester] Keeper not configured, skipping write transaction for harvest.');
    return;
  }

  console.log('[Harvester] Executing harvestAll transaction...');
  try {
    const hash = await walletClient.writeContract({
      address: FEEMON_ADDRESS,
      abi: FEEMON_ABI,
      functionName: 'harvestAll',
    });

    console.log(`[Harvester] Staking harvest transaction submitted: ${hash}`);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log('[Harvester] Harvest transaction confirmed.');

    // Fetch and save updated stats
    await updateProtocolStats();
  } catch (err) {
    console.error('[Harvester] Staking harvest failed:', err.message);
  }
};

export const startHarvester = () => {
  console.log('[Harvester] Harvester crons scheduled. Staking compounder runs every 30 minutes.');
  
  // Schedule harvest cron (every 30 minutes)
  cron.schedule('*/30 * * * *', harvest);

  // Poll protocol stats every 60 seconds
  setInterval(updateProtocolStats, 60000);
};
export default startHarvester;
