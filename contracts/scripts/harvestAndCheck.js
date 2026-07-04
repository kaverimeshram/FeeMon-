import { createWalletClient, createPublicClient, http, parseAbi, defineChain } from 'viem';
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

const FEEMON_ABI = parseAbi([
  'function harvestAll() external',
  'function exchangeRate() external view returns (uint256)'
]);

async function main() {
  console.log("Calling harvestAll() on FeeMON contract...");
  
  const hash = await walletClient.writeContract({
    address: FEEMON_ADDRESS,
    abi: FEEMON_ABI,
    functionName: 'harvestAll',
  });
  
  console.log(`Transaction submitted. Hash: ${hash}`);
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Harvest complete. Tx: ${receipt.transactionHash}`);
  
  const rate = await publicClient.readContract({
    address: FEEMON_ADDRESS,
    abi: FEEMON_ABI,
    functionName: 'exchangeRate',
  });
  
  const rateEth = Number(rate) / 1e18;
  console.log(`Harvest complete. New exchange rate: ${rateEth}`);
}

main().catch(err => {
  console.error("Execution failed:", err);
  process.exit(1);
});
