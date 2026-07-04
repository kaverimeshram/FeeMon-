const { ethers } = require("hardhat");

async function main() {
  const feemonAddress = "0x14229653B221175e3BB06aC3Ae68CdC7728e1E44";
  const registryAddress = "0x15370B82E0A173bE73227c0C1C7cB2E5e657677a";
  const tokenAddress = "0xF6D4d73b5Df893422198342A860bBc0818A9F76E";

  const feemon = await ethers.getContractAt("FeeMON", feemonAddress);
  const token = await ethers.getContractAt("FeeToken", tokenAddress);

  const tokenOwner = await token.owner();
  const feemonOwner = await feemon.owner();
  const feemonRegistry = await feemon.registry();
  const feemonToken = await feemon.fMonToken();

  console.log("--- Contract Configuration ---");
  console.log("FeeToken Address:    ", tokenAddress);
  console.log("FeeToken Owner:      ", tokenOwner);
  console.log("FeeMON Address:      ", feemonAddress);
  console.log("FeeMON Owner:        ", feemonOwner);
  console.log("FeeMON Registry Ref: ", feemonRegistry);
  console.log("FeeMON Token Ref:    ", feemonToken);
}

main().catch(console.error);
