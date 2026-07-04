const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const feemonAddress = "0x14229653B221175e3BB06aC3Ae68CdC7728e1E44";
  const registryAddress = "0x15370B82E0A173bE73227c0C1C7cB2E5e657677a";

  const tokenAddress = "0xF6D4d73b5Df893422198342A860bBc0818A9F76E";

  console.log("Verifying deployed contracts on Monad Testnet...");
  
  // Get code at address
  const feemonCode = await ethers.provider.getCode(feemonAddress);
  const registryCode = await ethers.provider.getCode(registryAddress);
  const tokenCode = await ethers.provider.getCode(tokenAddress);
  
  console.log("FeeMON Bytecode exists:", feemonCode !== "0x");
  console.log("ValidatorRegistry Bytecode exists:", registryCode !== "0x");
  console.log("FeeToken Bytecode exists:", tokenCode !== "0x");

  const feemon = await ethers.getContractAt("FeeMON", feemonAddress);
  const registry = await ethers.getContractAt("ValidatorRegistry", registryAddress);
  const token = await ethers.getContractAt("FeeToken", tokenAddress);

  const rate = await feemon.exchangeRate();
  const total = await feemon.totalMONManaged();
  const count = await registry.registeredCount();
  const balance = await token.balanceOf(deployer.address);

  console.log(`\nExchange Rate:     ${ethers.formatEther(rate)}`);
  console.log(`Total MON Managed: ${ethers.formatEther(total)} MON`);
  console.log(`Registered Count:  ${count.toString()}`);
  console.log(`fMON Balance:      ${ethers.formatEther(balance)} fMON`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
