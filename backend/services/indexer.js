import { publicClient } from '../viem.js';
import * as db from '../db.js';

const STAKING_PRECOMPILE = '0x0000000000000000000000000000000000001000';
const SELECTOR = '0x9ed23a21';

// Keep track of failed block fetch attempts
const blockFailCounts = {};

let isIndexing = false;

const indexBlocks = async () => {
  if (isIndexing) return;
  isIndexing = true;
  try {
    const latestBlockBig = await publicClient.getBlockNumber();
    const latest = Number(latestBlockBig);
    
    let lastIndexed = db.getLastIndexedBlock();
    
    // Initialize starting block if first run
    if (lastIndexed === 0) {
      // Sync starting from 20 blocks ago to capture recent activity without overload
      lastIndexed = Math.max(0, latest - 20);
      await db.setLastIndexedBlock(lastIndexed);
      console.log(`[Indexer] Initialized starting block to ${lastIndexed}`);
    }

    if (latest <= lastIndexed) {
      return;
    }

    // Limit batch processing to max 5 blocks per tick to prevent RPC rate limiting
    const targetBlock = Math.min(latest, lastIndexed + 5);

    for (let blockNum = lastIndexed + 1; blockNum <= targetBlock; blockNum++) {
      let block = null;
      let retries = blockFailCounts[blockNum] || 0;

      try {
        block = await publicClient.getBlock({
          blockNumber: BigInt(blockNum),
          includeTransactions: true,
        });
      } catch (blockErr) {
        retries += 1;
        blockFailCounts[blockNum] = retries;
        console.error(`[Indexer] Failed to fetch block ${blockNum} (attempt ${retries}/3):`, blockErr.message);
        
        if (retries >= 3) {
          console.warn(`[Indexer] Block ${blockNum} failed 3 times. Skipping to avoid blocking pipeline.`);
          await db.setLastIndexedBlock(blockNum);
        }
        // Break out of loop for this tick to retry on the next tick
        break;
      }

      // If we successfully fetched the block
      if (block && block.transactions) {
        for (const tx of block.transactions) {
          // Verify target contract is Monad staking precompile
          if (tx.to && tx.to.toLowerCase() === STAKING_PRECOMPILE.toLowerCase()) {
            // Verify function selector matches externalReward()
            if (tx.input && tx.input.toLowerCase().startsWith(SELECTOR.toLowerCase())) {
              try {
                // Decode validatorId (uint64, first 32 bytes after selector: input offset 10 to 74)
                const valIdHex = tx.input.slice(10, 74);
                const validatorId = Number(BigInt('0x' + valIdHex));
                
                // Verify validator registry DB has this node registered
                const registeredVal = db.getValidator(validatorId);
                if (registeredVal) {
                  const amountMon = Number(tx.value) / 1e18;
                  
                  await db.recordShareEvent(
                    validatorId,
                    amountMon,
                    tx.hash,
                    blockNum
                  );

                  console.log(`[Indexer] [Block ${blockNum}] externalReward from validatorId ${validatorId}, amount ${amountMon} MON`);
                }
              } catch (decodeErr) {
                console.error('[Indexer] Error decoding externalReward transaction input:', decodeErr.message);
              }
            }
          }
        }
        
        // Progress index progress in DB
        await db.setLastIndexedBlock(blockNum);
        delete blockFailCounts[blockNum];
      }
    }
  } catch (err) {
    console.error('[Indexer] Global indexing poll error:', err.message);
  } finally {
    isIndexing = false;
  }
};

export const startIndexer = () => {
  const lastIndexed = db.getLastIndexedBlock();
  console.log(`[Indexer] Starting from block ${lastIndexed}`);
  
  // Poll every 2000ms
  setInterval(indexBlocks, 2000);
};
export default startIndexer;
