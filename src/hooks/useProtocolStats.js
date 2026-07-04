import useWallet from './useWallet';

export const useProtocolStats = () => {
  const { exchangeRate, totalMONManaged, loadBalances } = useWallet();

  return {
    exchangeRate,
    totalStaked: totalMONManaged,
    loading: false,
    error: null,
    refresh: loadBalances,
  };
};

export default useProtocolStats;
