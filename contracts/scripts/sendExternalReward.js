import { createWalletClient, createPublicClient, http, parseAbi, parseEther, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';

dotenv.config();

const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY;
const FEEMON_ADDRESS = process.env.FEEMON_ADDRESS || process.env.VITE_FEEMON_ADDRESS;

if (!KEEPER_PRIVATE_KEY) {
  console.error("Error: KEEPER_PRIVATE_KEY not set in .env");
  process.exit(1);
}

if (!FEEMON_ADDRESS) {
  console.error("Error: FEEMON_ADDRESS not set in .env");
  process.exit(1);
}

const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.monad.xyz'],
    },
    public: {
      http: ['https://testnet-rpc.monad.xyz'],
    },
  },
});

const account = privateKeyToAccount(KEEPER_PRIVATE_KEY);

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

const walletClient = createWalletClient({
  account,
  chain: monadTestnet,
  transport: http(),
});

const STAKING_PRECOMPILE = '0x0000000000000000000000000000000000001000';

const STAKING_ABI = parseAbi([
  'function externalReward(uint64 validatorId) external payable returns (bool)',
  'function getDelegator(uint64 validatorId, address delegator) external view returns (uint256 stake, uint256 unclaimedRewards)'
]);

async function main() {
  const validatorId = 1n; // uint64 is BigInt in viem
  const amount = parseEther('1'); // exactly 1 MON
  
  console.log(`Sending externalReward of 1 MON to validator ${validatorId}...`);
  
  const hash = await walletClient.writeContract({
    address: STAKING_PRECOMPILE,
    abi: STAKING_ABI,
    functionName: 'externalReward',
    args: [validatorId],
    value: amount,
  });
  
  console.log(`Transaction submitted. Hash: ${hash}`);
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`externalReward sent. Tx: ${receipt.transactionHash}`);
  
  // Read getDelegator from staking precompile
  const result = await publicClient.readContract({
    address: STAKING_PRECOMPILE,
    abi: STAKING_ABI,
    functionName: 'getDelegator',
    args: [validatorId, FEEMON_ADDRESS],
  });
  
  // result is [stake, unclaimedRewards]
  const unclaimedRewards = result[1];
  console.log(`unclaimedRewards: ${unclaimedRewards.toString()}`);
}

main().catch(err => {
  console.error("Execution failed:", err);
  process.exit(1);
});
