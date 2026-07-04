import { createPublicClient, createWalletClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { MONAD_RPC, KEEPER_PRIVATE_KEY } from './config.js';

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [MONAD_RPC] },
    public: { http: [MONAD_RPC] }
  }
});

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http()
});

let keeperAccount = null;
export let walletClient = null;

if (KEEPER_PRIVATE_KEY && KEEPER_PRIVATE_KEY !== '0xPLACEHOLDER' && KEEPER_PRIVATE_KEY !== '') {
  try {
    const formattedKey = KEEPER_PRIVATE_KEY.startsWith('0x') ? KEEPER_PRIVATE_KEY : `0x${KEEPER_PRIVATE_KEY}`;
    keeperAccount = privateKeyToAccount(formattedKey);
    walletClient = createWalletClient({
      account: keeperAccount,
      chain: monadTestnet,
      transport: http()
    });
  } catch (err) {
    console.error('[Viem] Error initializing keeper account:', err.message);
  }
} else {
  console.log('[Viem] Keeper private key not set. Staking harvester will skip write transactions.');
}
