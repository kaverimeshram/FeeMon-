const { ethers } = require("hardhat");

async function main() {
  const feemonAddress = "0x14229653B221175e3BB06aC3Ae68CdC7728e1E44";
  const [deployer] = await ethers.getSigners();

  console.log("Sending real deposit transaction on FeeMON contract:", feemonAddress);
  const feemon = await ethers.getContractAt("FeeMON", feemonAddress);

  const tx = await feemon.deposit({ value: ethers.parseEther("0.15") });
  console.log("Transaction sent! Hash:", tx.hash);
  
  console.log("Waiting for confirmation...");
  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt.blockNumber);
  console.log("Status:", receipt.status === 1 ? "SUCCESS" : "FAILED");
}

main().catch((err) => {
  console.error("Transaction failed!");
  console.error(err);
});
