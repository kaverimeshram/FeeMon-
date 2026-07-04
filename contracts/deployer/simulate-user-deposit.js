const { ethers } = require("hardhat");

async function main() {
  const feemonAddress = "0x14229653B221175e3BB06aC3Ae68CdC7728e1E44";
  const userAddress = "0x1E98f6a679Ee3022932Bb9898B6E5cAdc9B287f6";

  console.log(`Simulating deposit() on FeeMON contract from user address ${userAddress}...`);
  const feemon = await ethers.getContractAt("FeeMON", feemonAddress);

  const tx = await feemon.deposit.populateTransaction({
    value: ethers.parseEther("0.5"),
    from: userAddress
  });

  try {
    const result = await ethers.provider.call(tx);
    console.log("Simulation call returned successfully:", result);
  } catch (error) {
    console.error("Simulation failed! Error details:");
    console.error(error);
  }
}

main().catch(console.error);
