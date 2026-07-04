const { ethers } = require("hardhat");

async function main() {
  const address = "0x1E98f6a679Ee3022932Bb9898B6E5cAdc9B287f6";
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log("Current block number:", blockNumber);
  
  for (let i = 0; i < 300; i++) {
    const targetBlock = blockNumber - i;
    const block = await ethers.provider.getBlock(targetBlock, true);
    if (block && block.transactions) {
      for (const tx of block.transactions) {
        const hash = typeof tx === "string" ? tx : tx.hash;
        const fullTx = typeof tx === "string" ? await ethers.provider.getTransaction(tx) : tx;
        if (fullTx && fullTx.from.toLowerCase() === address.toLowerCase()) {
          const receipt = await ethers.provider.getTransactionReceipt(hash);
          console.log(`Block ${targetBlock} | Tx: ${hash}`);
          console.log(`  To: ${fullTx.to}`);
          console.log(`  Value: ${ethers.formatEther(fullTx.value)} MON`);
          console.log(`  Status: ${receipt.status === 1 ? "Success" : "Failed"}`);
          if (receipt.status === 0) {
            try {
              await ethers.provider.call(fullTx, targetBlock - 1);
            } catch (err) {
              console.log("  Revert Reason:", err.message || err);
            }
          }
        }
      }
    }
    await new Promise(resolve => setTimeout(resolve, 80));
  }
  console.log("Finished scan.");
}

main().catch(console.error);
