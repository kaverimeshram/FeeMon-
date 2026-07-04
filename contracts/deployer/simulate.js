const { ethers } = require("hardhat");

async function main() {
  const feemonAddress = "0x14229653B221175e3BB06aC3Ae68CdC7728e1E44";
  const [deployer] = await ethers.getSigners();

  console.log("Simulating deposit() on FeeMON contract:", feemonAddress);
  const feemon = await ethers.getContractAt("FeeMON", feemonAddress);

  try {
    const tx = await feemon.deposit.populateTransaction({ value: ethers.parseEther("0.5") });
    console.log("Transaction populated successfully. Simulating call...");
    
    const result = await deployer.call(tx);
    console.log("Simulation call returned successfully:", result);
  } catch (error) {
    console.error("Simulation failed!");
    console.error(error);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
