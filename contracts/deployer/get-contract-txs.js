const { ethers } = require("hardhat");

async function main() {
  const feemonAddress = "0x14229653B221175e3BB06aC3Ae68CdC7728e1E44";
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log("Current block number:", blockNumber);

  const feemon = await ethers.getContractAt("FeeMON", feemonAddress);
  const filter = feemon.filters.Deposited();
  const logs = await feemon.queryFilter(filter, blockNumber - 100, blockNumber);
  console.log(`Found ${logs.length} Deposited events in the last 100 blocks:`);
  for (const log of logs) {
    console.log(`Block ${log.blockNumber} | Tx ${log.transactionHash} | User ${log.args.user} | Amount ${ethers.formatEther(log.args.monAmount)} MON`);
  }
}

main().catch(console.error);
