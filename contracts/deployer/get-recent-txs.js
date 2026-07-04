const { ethers } = require("hardhat");

async function main() {
  const address = "0x1E98f6a679Ee3022932Bb9898B6E5cAdc9B287f6";
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log("Current block number:", blockNumber);
  
  // Scan last 50 blocks
  for (let i = 0; i < 50; i++) {
    const block = await ethers.provider.getBlock(blockNumber - i, true);
    if (block && block.transactions) {
      for (const tx of block.transactions) {
        const hash = typeof tx === "string" ? tx : tx.hash;
        const fullTx = typeof tx === "string" ? await ethers.provider.getTransaction(tx) : tx;
        if (fullTx && (fullTx.from.toLowerCase() === address.toLowerCase() || fullTx.to?.toLowerCase() === address.toLowerCase())) {
          const receipt = await ethers.provider.getTransactionReceipt(hash);
          console.log(`Block ${blockNumber - i} | Tx: ${hash}`);
          console.log(`  From: ${fullTx.from} -> To: ${fullTx.to}`);
          console.log(`  Value: ${ethers.formatEther(fullTx.value)} MON`);
          console.log(`  Status: ${receipt.status === 1 ? "Success" : "Failed"}`);
        }
      }
    }
  }
}

main().catch(console.error);
