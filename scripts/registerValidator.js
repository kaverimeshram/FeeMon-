import { createWalletClient, createPublicClient, http, parseAbi, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';

dotenv.config();

const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY;
const REGISTRY_ADDRESS = process.env.VITE_REGISTRY_ADDRESS || process.env.REGISTRY_ADDRESS;

if (!KEEPER_PRIVATE_KEY) {
  console.error("Error: KEEPER_PRIVATE_KEY not set in .env");
  process.exit(1);
}

if (!REGISTRY_ADDRESS) {
  console.error("Error: REGISTRY_ADDRESS not configured");
  process.exit(1);
}

const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
    public: { http: ['https://testnet-rpc.monad.xyz'] },
  },
});

const account = privateKeyToAccount(KEEPER_PRIVATE_KEY);
const publicClient = createPublicClient({ chain: monadTestnet, transport: http() });
const walletClient = createWalletClient({ account, chain: monadTestnet, transport: http() });

const REGISTRY_ABI = parseAbi([
  'function register(uint64 validatorId, uint256 minFeeShareBps) external'
]);

async function main() {
  const validatorId = 1n;
  const minFeeShareBps = 4000n; // 40.00%

  console.log(`Registering Validator #${validatorId} with ${Number(minFeeShareBps)/100}% fee share...`);
  
  const hash = await walletClient.writeContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: 'register',
    args: [validatorId, minFeeShareBps],
  });

  console.log(`Transaction submitted. Hash: ${hash}`);
  await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Validator #${validatorId} registered successfully!`);
}

main().catch(console.error);
