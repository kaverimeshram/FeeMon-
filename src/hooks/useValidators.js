import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../lib/contracts';

export const useValidators = () => {
  const [validators, setValidators] = useState([]);
  const [stats, setStats] = useState({
    totalStaked: '0.00 MON',
    activeValidators: 0,
    avgFeeShare: '0%',
    fmonRate: '1.0000',
  });
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const fetchValidators = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/validators`);
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      const data = await response.json();
      setIsOffline(false);

      let validatorList = [];
      let calculatedStats = {
        totalStaked: '0.00 MON',
        activeValidators: 0,
        avgFeeShare: '0%',
        fmonRate: '1.0000',
      };

      if (Array.isArray(data)) {
        // Normalize the validator items from the backend
        validatorList = data.map(v => ({
          validatorId: v.id,
          feeSharePercent: v.feeSharePct,
          totalShared: v.totalShared,
          shareCount: v.shareCount,
          lastShareTimestamp: v.lastShare,
          hoursAgo: v.hoursAgo,
          active: v.status === 'active' || v.status === 'at_risk',
          status: v.status === 'active' ? 'Active' : (v.status === 'at_risk' ? 'At Risk' : 'Inactive'),
          shareHistory: v.shareHistory || []
        }));
        
        // Calculate stats from the array of validators
        const activeVals = validatorList.filter(v => v.active);
        const activeCount = activeVals.length;

        // Calculate average fee share
        let totalFeeShare = 0;
        validatorList.forEach(v => {
          totalFeeShare += parseFloat(v.feeSharePercent || 0);
        });
        const avgShare = validatorList.length > 0 ? (totalFeeShare / validatorList.length).toFixed(0) : '0';

        // Calculate total shared in MON
        let totalStakedSum = 0;
        validatorList.forEach(v => {
          totalStakedSum += parseFloat(v.totalShared || 0);
        });

        calculatedStats = {
          totalStaked: `${totalStakedSum.toFixed(2)} MON`,
          activeValidators: activeCount,
          avgFeeShare: `${avgShare}%`,
          fmonRate: '1.0000',
        };
      } else if (data && typeof data === 'object') {
        // If it returns a structured object
        const rawList = data.validators || [];
        validatorList = rawList.map(v => ({
          validatorId: v.id || v.validatorId,
          feeSharePercent: v.feeSharePct !== undefined ? v.feeSharePct : v.feeSharePercent,
          totalShared: v.totalShared,
          shareCount: v.shareCount,
          lastShareTimestamp: v.lastShare || v.lastShareTimestamp,
          hoursAgo: v.hoursAgo,
          active: v.status === 'active' || v.status === 'at_risk' || v.active,
          status: v.status === 'active' ? 'Active' : (v.status === 'at_risk' ? 'At Risk' : (v.status || 'Inactive')),
          shareHistory: v.shareHistory || []
        }));
        calculatedStats = {
          totalStaked: data.totalStaked || '0.00 MON',
          activeValidators: data.activeValidators || 0,
          avgFeeShare: data.avgFeeShare || '0%',
          fmonRate: data.fmonRate || '1.0000',
        };
      }

      setValidators(validatorList);
      setStats(calculatedStats);
    } catch (err) {
      console.warn('Backend API unreachable. Falling back to empty stats and offline banner.', err);
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchValidators();
    const interval = setInterval(fetchValidators, 30000); // 30 seconds refresh
    return () => clearInterval(interval);
  }, [fetchValidators]);

  return {
    validators,
    stats,
    loading,
    isOffline,
    refresh: fetchValidators,
  };
};

export default useValidators;
