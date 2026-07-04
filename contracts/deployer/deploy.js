const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying from:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(
    await hre.ethers.provider.getBalance(deployer.address)
  ), "MON");

  // 1. Deploy ValidatorRegistry first
  console.log("\nDeploying ValidatorRegistry...");
  const ValidatorRegistry = await hre.ethers.getContractFactory("ValidatorRegistry");
  const registry = await ValidatorRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("ValidatorRegistry deployed to:", registryAddress);



  // 2. Deploy FeeToken (fMON)
  console.log("\nDeploying FeeToken...");
  const FeeToken = await hre.ethers.getContractFactory("FeeToken");
  // Pass a temporary minter — we will update it after FeeMON deploys
  const feeToken = await FeeToken.deploy();
  await feeToken.waitForDeployment();
  const feeTokenAddress = await feeToken.getAddress();
  console.log("FeeToken deployed to:", feeTokenAddress);

  // 3. Deploy FeeMON
  console.log("\nDeploying FeeMON...");
  const FeeMON = await hre.ethers.getContractFactory("FeeMON");
  const feemon = await FeeMON.deploy(registryAddress, feeTokenAddress);
  await feemon.waitForDeployment();
  const feemonAddress = await feemon.getAddress();
  console.log("FeeMON deployed to:", feemonAddress);

  // 4. Transfer ownership of FeeToken to FeeMON so it can mint/burn fMON
  console.log("\nLinking FeeToken minter to FeeMON...");
  const tx1 = await feeToken.transferOwnership(feemonAddress);
  await tx1.wait();
  console.log("Minter set.");

  // 6. Print everything you need for .env
  console.log("\n==========================================");
  console.log("COPY THESE INTO YOUR .env FILES:");
  console.log("==========================================");
  console.log(`VITE_FEEMON_ADDRESS=${feemonAddress}`);
  console.log(`VITE_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`VITE_FMON_ADDRESS=${feeTokenAddress}`);
  console.log(`FEEMON_ADDRESS=${feemonAddress}`);
  console.log(`REGISTRY_ADDRESS=${registryAddress}`);
  console.log("==========================================");

  // 7. Verify on explorer
  console.log("\nView on explorer:");
  console.log(`https://testnet.monadvision.com/address/${feemonAddress}`);
  console.log(`https://testnet.monadvision.com/address/${registryAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
