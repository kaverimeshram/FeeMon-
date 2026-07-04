import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { formatEther } from 'viem';
import { publicClient } from '../lib/viem';
import { API_BASE, FMON_ADDRESS, FMON_ABI, FEEMON_ADDRESS, FEEMON_ABI, REGISTRY_ADDRESS, REGISTRY_ABI, STAKING_ABI } from '../lib/contracts';

export const WalletContext = createContext(null);

export const WalletProvider = ({ children }) => {
  const [address, setAddress] = useState(null);
  const [monBalance, setMonBalance] = useState('0.00');
  const [fmonBalance, setFmonBalance] = useState('0.00');
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState('1.0000');
  const [totalMONManaged, setTotalMONManaged] = useState('0.00');
  const [userDelegation, setUserDelegation] = useState({
    validatorId: 0n,
    amount: '0.00',
    fmonBalance: '0.00',
    feeSharePct: '0.00'
  });
  const [lastDepositTime, setLastDepositTime] = useState(0);
  const [unclaimedRewards, setUnclaimedRewards] = useState('0.0000');
  const [validatorsSharingFees, setValidatorsSharingFees] = useState(0);
  const [totalFeesShared, setTotalFeesShared] = useState('0.0000');
  const [lastHarvest, setLastHarvest] = useState('Never');
  const latestAddressRef = useRef(null);
  const initStartedRef = useRef(false);
  const connectInFlightRef = useRef(false);
  const inFlightBalancesRef = useRef(null);
  const lastBalancesRef = useRef({ key: '', time: 0 });

  useEffect(() => {
    latestAddressRef.current = address;
  }, [address]);

  const notifyDepositSuccess = useCallback(() => {
    setLastDepositTime(Date.now());
  }, []);

  useEffect(() => {
    window.notifyDepositSuccess = notifyDepositSuccess;
  }, [notifyDepositSuccess]);

  // Check if chain ID is Monad Testnet (10143 or 0x279F)
  const checkNetwork = useCallback((chainId) => {
    const targetChainIdDec = 10143;
    if (!chainId) return;
    
    const parsedChainId = typeof chainId === 'string' 
      ? parseInt(chainId, 16) 
      : Number(chainId);

    if (parsedChainId === targetChainIdDec) {
      setIsWrongNetwork(false);
    } else {
      setIsWrongNetwork(true);
    }
  }, []);

  // Load balances and global protocol stats
  const loadBalances = useCallback(async (userAddress, options = {}) => {
    const targetAddress = userAddress || latestAddressRef.current;
    const force = options.force === true;
    const cacheKey = targetAddress || 'global';
    const now = Date.now();

    if (!force && inFlightBalancesRef.current?.key === cacheKey) {
      return inFlightBalancesRef.current.promise;
    }

    if (!force && lastBalancesRef.current.key === cacheKey && now - lastBalancesRef.current.time < 5000) {
      return;
    }

    const loadPromise = (async () => {
      // 1. Fetch user-specific balances if connected
      if (targetAddress) {
        try {
          const [balanceWei, fmonWei, delegationData] = await Promise.all([
            publicClient.getBalance({ address: targetAddress }),
            publicClient.readContract({
              address: FMON_ADDRESS,
              abi: FMON_ABI,
              functionName: 'balanceOf',
              args: [targetAddress],
            }),
            publicClient.readContract({
              address: FEEMON_ADDRESS,
              abi: FEEMON_ABI,
              functionName: 'getUserDelegation',
              args: [targetAddress],
            }),
          ]);

          const monVal = parseFloat(formatEther(balanceWei)).toFixed(4);
          setMonBalance(monVal);

          const fmonVal = parseFloat(formatEther(fmonWei)).toFixed(4);
          setFmonBalance(fmonVal);

          const valId = BigInt(delegationData[0]);
          const amt = parseFloat(formatEther(delegationData[1])).toFixed(4);
          const fmonBal = parseFloat(formatEther(delegationData[2])).toFixed(4);

          let feeSharePct = '0.00';
          if (valId > 0n) {
            try {
              const validatorInfo = await publicClient.readContract({
                address: REGISTRY_ADDRESS,
                abi: REGISTRY_ABI,
                functionName: 'getValidator',
                args: [valId],
              });
              const bps = validatorInfo.minFeeShareBps !== undefined ? validatorInfo.minFeeShareBps : validatorInfo[2];
              feeSharePct = (Number(bps) / 100).toFixed(2);
            } catch (valErr) {
              console.warn('Error fetching validator info in loadBalances:', valErr);
            }
          }

          setUserDelegation({
            validatorId: valId,
            amount: amt,
            fmonBalance: fmonBal,
            feeSharePct: feeSharePct
          });
        } catch (userErr) {
          console.error('Error fetching user balances:', userErr);
        }
      }

      // 2. Fetch global protocol stats. Prefer backend cache to avoid RPC bursts in the browser.
      try {
        let loadedStatsFromBackend = false;
        try {
          const response = await fetch(`${API_BASE}/stats`);
          if (response.ok) {
            const stats = await response.json();
            setExchangeRate(Number(stats.exchangeRate || 1).toFixed(4));
            setTotalMONManaged(Number(stats.totalMONManaged || 0).toFixed(2));
            setUnclaimedRewards(Number(stats.unclaimedRewards || 0).toFixed(4));
            setValidatorsSharingFees(Number(stats.validatorsSharingFees || 0));
            setTotalFeesShared(Number(stats.totalFeesShared || 0).toFixed(4));
            setLastHarvest(stats.lastHarvest || 'Never');
            loadedStatsFromBackend = true;
          }
        } catch {
          // Backend can be offline in local dev; fall back to direct contract reads below.
        }

        if (!loadedStatsFromBackend) {
          const [rateWei, totalWei] = await Promise.all([
            publicClient.readContract({
              address: FEEMON_ADDRESS,
              abi: FEEMON_ABI,
              functionName: 'exchangeRate',
            }),
            publicClient.readContract({
              address: FEEMON_ADDRESS,
              abi: FEEMON_ABI,
              functionName: 'totalMONManaged',
            }),
          ]);

          const rateVal = parseFloat(formatEther(rateWei)).toFixed(4);
          setExchangeRate(rateVal);

          const totalVal = parseFloat(formatEther(totalWei)).toFixed(2);
          setTotalMONManaged(totalVal);

          // Direct chain read fallback for unclaimedRewards
          try {
            const activeIds = await publicClient.readContract({
              address: REGISTRY_ADDRESS,
              abi: REGISTRY_ABI,
              functionName: 'getActiveValidators',
            });
            let totalUnclaimedWei = 0n;
            for (const valId of activeIds) {
              try {
                const result = await publicClient.readContract({
                  address: '0x0000000000000000000000000000000000001000', // Staking
                  abi: STAKING_ABI,
                  functionName: 'getDelegator',
                  args: [valId, FEEMON_ADDRESS]
                });
                totalUnclaimedWei += result[1];
              } catch {}
            }
            setUnclaimedRewards(parseFloat(formatEther(totalUnclaimedWei)).toFixed(4));
            setValidatorsSharingFees(activeIds.length > 0 ? 1 : 0);
            setTotalFeesShared('0.0000');
            setLastHarvest('Never');
          } catch (err) {
            console.warn('[DirectRead] Failed to direct read unclaimed rewards:', err.message);
          }
        }
      } catch (err) {
        console.warn('Error reading global protocol stats:', err);
      }
    })();

    inFlightBalancesRef.current = { key: cacheKey, promise: loadPromise };

    try {
      await loadPromise;
      lastBalancesRef.current = { key: cacheKey, time: Date.now() };
    } finally {
      if (inFlightBalancesRef.current?.promise === loadPromise) {
        inFlightBalancesRef.current = null;
      }
    }
  }, []);

  // Keep fetchBalances mapped to loadBalances for backward compatibility
  const fetchBalances = loadBalances;

  // Switch network helper
  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x279F' }],
      });
      setIsWrongNetwork(false);
    } catch (switchError) {
      console.error('Failed to switch network:', switchError);
    }
  }, []);

  // Connect wallet sequence
  const connectWallet = useCallback(async () => {
    if (connectInFlightRef.current) return;

    if (!window.ethereum) {
      alert('No Web3 wallet found. Please install MetaMask or Rabby.');
      return;
    }

    connectInFlightRef.current = true;
    setIsLoading(true);
    try {
      // 1. Call wallet_addEthereumChain to add Monad Testnet
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x279F',
              chainName: 'Monad Testnet',
              rpcUrls: ['https://testnet-rpc.monad.xyz'],
              nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
              blockExplorerUrls: ['https://testnet.monadexplorer.com'],
            },
          ],
        });
      } catch (addError) {
        if (addError?.code === -32002) {
          console.info('MetaMask already has a pending network permission request.');
          return;
        }
        if (addError?.code === 4001) {
          console.info('User rejected adding Monad Testnet.');
          return;
        }
        console.error('Error adding Monad Testnet chain:', addError);
        // Continue anyway in case chain is already added but switch is needed
      }

      // Ensure switch happens if we added it or if it is already there
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x279F' }],
        });
      } catch (switchErr) {
        if (switchErr?.code === -32002) {
          console.info('MetaMask already has a pending network switch request.');
          return;
        }
        if (switchErr?.code === 4001) {
          console.info('User rejected switching to Monad Testnet.');
          return;
        }
        console.warn('Switch chain call returned error, proceeding:', switchErr);
      }

      // 2. Request accounts
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts && accounts[0]) {
        const userAddress = accounts[0];
        setAddress(userAddress);
        setIsConnected(true);
        
        // Check current chain ID
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        checkNetwork(currentChainId);

        // Load balances
        await fetchBalances(userAddress);
      }
    } catch (err) {
      if (err?.code === -32002) {
        console.info('MetaMask already has a pending wallet permission request.');
      } else if (err?.code === 4001) {
        console.info('User rejected wallet connection.');
      } else {
        console.error('Error connecting wallet:', err);
      }
    } finally {
      connectInFlightRef.current = false;
      setIsLoading(false);
    }
  }, [checkNetwork, fetchBalances]);

  // Auto connect/check if already authorized on load
  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    const init = async () => {
      if (!window.ethereum) return;
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        checkNetwork(chainId);

        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts[0]) {
          setAddress(accounts[0]);
          setIsConnected(true);
          await fetchBalances(accounts[0]);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      }
    };
    init();
  }, [checkNetwork, fetchBalances]);

  // Setup listeners for network and account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccounts = (accounts) => {
      if (accounts && accounts[0]) {
        setAddress(accounts[0]);
        setIsConnected(true);
        fetchBalances(accounts[0]);
      } else {
        setAddress(null);
        setIsConnected(false);
        setMonBalance('0.00');
        setFmonBalance('0.00');
        setUserDelegation({
          validatorId: 0n,
          amount: '0.00',
          fmonBalance: '0.00',
          feeSharePct: '0.00'
        });
      }
    };

    const handleChain = (chainId) => {
      checkNetwork(chainId);
      if (latestAddressRef.current) {
        fetchBalances(latestAddressRef.current);
      }
    };

    window.ethereum.on('accountsChanged', handleAccounts);
    window.ethereum.on('chainChanged', handleChain);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccounts);
        window.ethereum.removeListener('chainChanged', handleChain);
      }
    };
  }, [checkNetwork, fetchBalances]);

  // Poll balances every 30 seconds if connected
  useEffect(() => {
    if (!isConnected || !address) return;

    const interval = setInterval(() => {
      fetchBalances(address);
    }, 60000);

    return () => clearInterval(interval);
  }, [isConnected, address, fetchBalances]);

  // Fetch global stats on mount
  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  const refreshBalances = useCallback(async () => {
    await loadBalances(address, { force: true });
  }, [address, loadBalances]);

  return (
    <WalletContext.Provider
      value={{
        address,
        monBalance,
        fmonBalance,
        isWrongNetwork,
        isConnected,
        isLoading,
        connectWallet,
        switchNetwork,
        refreshBalances,
        setMonBalance,
        setFmonBalance,
        exchangeRate,
        totalMONManaged,
        loadBalances,
        userDelegation,
        lastDepositTime,
        notifyDepositSuccess,
        unclaimedRewards,
        setUnclaimedRewards,
        validatorsSharingFees,
        totalFeesShared,
        lastHarvest,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
