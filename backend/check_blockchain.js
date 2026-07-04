import { createPublicClient, http, formatEther, parseEther } from 'viem';

const publicClient = createPublicClient({
  chain: {
    id: 10143,
    name: 'Monad Testnet',
    network: 'monad-testnet',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://testnet-rpc.monad.xyz'] },
      public: { http: ['https://testnet-rpc.monad.xyz'] }
    }
  },
  transport: http()
});

const userAddress = '0x1E98f6a679Ee3022932Bb9898B6E5cAdc9B287f6';
const FEEMON_ADDRESS = '0x168eE1F393Bc6C49dd985E640425Ba9f032cC781';
const FMON_ADDRESS = '0x59B2eAE3825551f32c88848ec5A55A95C507a3e5';

import { parseAbi } from 'viem';

const FEEMON_ABI = parseAbi([
  'function deposit() external payable returns (uint256)',
  'function exchangeRate() external view returns (uint256)',
  'function totalMONManaged() external view returns (uint256)',
  'function getUserDelegation(address user) external view returns (uint64 validatorId, uint256 amount, uint256 fmonBalance)',
  'function owner() external view returns (address)'
]);

const FMON_ABI = parseAbi([
  'function balanceOf(address) external view returns (uint256)',
  'function owner() external view returns (address)'
]);

const REGISTRY_ADDRESS = '0x02964113133036D4d648323374e655c3a04D7C3a';
const REGISTRY_ABI = parseAbi([
  'function getActiveValidators() external view returns (uint64[])',
  'function getValidator(uint64 validatorId) external view returns ((uint64 validatorId, address authAddress, uint256 minFeeShareBps, uint256 totalShared, uint256 lastShareTimestamp, uint256 shareCount, bool active, uint256 registeredAt) val)'
]);

async function main() {
  console.log('--- blockchain check start ---');
  console.log('User Address:', userAddress);
  console.log('FeeMON Address:', FEEMON_ADDRESS);
  console.log('FeeToken (fMON) Address:', FMON_ADDRESS);
  console.log('Registry Address:', REGISTRY_ADDRESS);

  try {
    const activeIds = await publicClient.readContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: 'getActiveValidators'
    });
    console.log('Active Validator IDs on Registry:', activeIds.map(x => x.toString()));
    for (const id of activeIds) {
      const val = await publicClient.readContract({
        address: REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: 'getValidator',
        args: [id]
      });
      console.log(`Validator ${id}:`, {
        validatorId: val.validatorId.toString(),
        authAddress: val.authAddress,
        minFeeShareBps: val.minFeeShareBps.toString(),
        totalShared: formatEther(val.totalShared),
        lastShareTimestamp: val.lastShareTimestamp.toString(),
        shareCount: val.shareCount.toString(),
        active: val.active,
        registeredAt: val.registeredAt.toString()
      });
    }
  } catch (e) {
    console.error('Failed to get registry validators:', e.message);
  }

  try {
    // 1. Get MON Balance
    const monBalance = await publicClient.getBalance({ address: userAddress });
    console.log('User MON Balance:', formatEther(monBalance), 'MON');
  } catch (e) {
    console.error('Failed to get MON Balance:', e.message);
  }

  try {
    // 2. Get fMON Balance
    const fmonBalance = await publicClient.readContract({
      address: FMON_ADDRESS,
      abi: FMON_ABI,
      functionName: 'balanceOf',
      args: [userAddress]
    });
    console.log('User fMON Balance:', formatEther(fmonBalance), 'fMON');
  } catch (e) {
    console.error('Failed to get fMON Balance:', e.message);
  }

  try {
    const fmonOwner = await publicClient.readContract({
      address: FMON_ADDRESS,
      abi: FMON_ABI,
      functionName: 'owner'
    });
    console.log('FeeToken (fMON) Owner:', fmonOwner);
  } catch (e) {
    console.error('Failed to get fMON Owner:', e.message);
  }

  try {
    const feemonOwner = await publicClient.readContract({
      address: FEEMON_ADDRESS,
      abi: FEEMON_ABI,
      functionName: 'owner'
    });
    console.log('FeeMON Owner:', feemonOwner);
  } catch (e) {
    console.error('Failed to get FeeMON Owner:', e.message);
  }

  try {
    // 3. Get Exchange Rate
    const rate = await publicClient.readContract({
      address: FEEMON_ADDRESS,
      abi: FEEMON_ABI,
      functionName: 'exchangeRate'
    });
    console.log('Exchange Rate:', formatEther(rate));
  } catch (e) {
    console.error('Failed to get Exchange Rate:', e.message);
  }

  try {
    // 4. Get User Delegation
    const delegation = await publicClient.readContract({
      address: FEEMON_ADDRESS,
      abi: FEEMON_ABI,
      functionName: 'getUserDelegation',
      args: [userAddress]
    });
    console.log('User Delegation:', {
      validatorId: delegation[0].toString(),
      amount: formatEther(delegation[1]),
      fmonBalance: formatEther(delegation[2])
    });
  } catch (e) {
    console.error('Failed to get User Delegation:', e.message);
  }

  // 5. Try simulating deposit(0.5 MON)
  console.log('Simulating deposit of 0.5 MON...');
  try {
    await publicClient.simulateContract({
      address: FEEMON_ADDRESS,
      abi: FEEMON_ABI,
      functionName: 'deposit',
      account: userAddress,
      value: parseEther('0.5')
    });
    console.log('Simulation SUCCEEDED!');
  } catch (err) {
    console.error('Simulation FAILED with error:', err.message || err);
  }
}

main().catch(console.error);
