import { createWalletClient, createPublicClient, http, parseEther, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';

dotenv.config();

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const monadTestnet = defineChain({
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
    public: { http: ['https://testnet-rpc.monad.xyz'] },
  },
});

const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY);
const publicClient = createPublicClient({ chain: monadTestnet, transport: http() });
const walletClient = createWalletClient({ account, chain: monadTestnet, transport: http() });

async function main() {
  const keeperAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  const nonce = await publicClient.getTransactionCount({ address: account.address });
  console.log(`Sending 1.5 MON to ${keeperAddress} using nonce ${nonce}...`);
  const hash = await walletClient.sendTransaction({
    to: keeperAddress,
    value: parseEther('1.5'),
    nonce,
    gas: 21000n,
  });
  console.log(`Submitted: ${hash}`);
  const rc = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`Status: ${rc.status}`);
}

main().catch(console.error);
