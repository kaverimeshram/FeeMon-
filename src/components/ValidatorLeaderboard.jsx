import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getValidatorName, getEstimatedAPY } from '../lib/contracts';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

export const ValidatorLeaderboard = () => {
  const [validators, setValidators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchValidators = useCallback(async (isRetryAttempt = false) => {
    if (!isRetryAttempt) {
      setLoading(true);
      setIsOffline(false);
      setIsRetrying(false);
    } else {
      setIsRetrying(true);
      setIsOffline(false);
    }

    try {
      const response = await fetch(`${API_BASE}/validators`);
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }
      const data = await response.json();
      
      let list = [];
      if (Array.isArray(data)) {
        list = data.map(v => ({
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
      }
      setValidators(list);
      setIsOffline(false);
      setIsRetrying(false);
      setLoading(false);
    } catch (err) {
      console.warn('Leaderboard fetch failed:', err);
      if (!isRetryAttempt) {
        // Retry once after 3 seconds
        setTimeout(() => {
          fetchValidators(true);
        }, 3000);
      } else {
        setIsOffline(true);
        setIsRetrying(false);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchValidators();
    const interval = setInterval(() => fetchValidators(false), 30000); // 30 seconds refresh
    return () => clearInterval(interval);
  }, [fetchValidators]);

  const handleRefresh = (e) => {
    e.preventDefault();
    fetchValidators(false);
  };

  const highestShare = validators.reduce((max, v) => {
    const valShare = parseFloat(v.feeSharePercent || 0);
    return valShare > max ? valShare : max;
  }, 0);

  const getIsRecommended = (val, idx) => {
    if (validators.length === 0) return false;
    if (validators.length === 1) return true;
    return parseFloat(val.feeSharePercent || 0) === highestShare;
  };

  return (
    <>
      <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="card-title">Validator Registry</div>
          <div className="card-desc">
            Validators competing for delegation through fee sharing.
          </div>
        </div>
      </div>

      {isOffline && (
        <div className="offline-banner">
          Analytics server offline. Core staking still works.
        </div>
      )}

      {isRetrying ? (
        <div style={{ color: 'var(--text-muted, #8b8b8f)', fontSize: '0.9rem', padding: '10px 0' }}>
          Connecting to backend...
        </div>
      ) : loading && validators.length === 0 ? (
        <div style={{ color: 'var(--text-muted)' }}>Loading registry...</div>
      ) : validators.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)', padding: '20px 0', fontSize: '0.95rem', lineHeight: '1.5' }}>
          No fee-sharing validators registered yet.
          <br />
          Validators can register on-chain to join feeMON.
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="clean-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Validator</th>
                <th>Fee Share</th>
                <th>Estimated APY</th>
                <th>Events</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {validators.map((val, idx) => {
                let sharePct = 0;
                if (val.feeSharePercent !== undefined) {
                  sharePct = parseFloat(val.feeSharePercent);
                } else if (val.minFeeShareBps !== undefined) {
                  sharePct = parseFloat(val.minFeeShareBps) / 100;
                }

                const isActive = val.active === true || val.status === 'Active';
                const isHighShare = sharePct > 20;

                return (
                  <tr
                    key={val.validatorId}
                    className={idx === 0 ? 'leaderboard-row-highlight' : ''}
                  >
                    <td>{idx + 1}</td>
                    <td>
                      {getIsRecommended(val, idx) && (
                        <div style={{ color: '#eab308', fontSize: '0.72rem', fontWeight: 600, marginBottom: '4px', lineHeight: '1.4' }}>
                          ⭐ Recommended<br />
                          Highest Fee Share ({parseFloat(val.feeSharePercent || 0).toFixed(0)}%)
                        </div>
                      )}
                      <Link
                        to={`/validator/${val.validatorId}`}
                        style={{
                          textDecoration: 'underline',
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {getValidatorName(val.validatorId)}
                      </Link>
                      {getIsRecommended(val, idx) && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #8b8b8f)', marginTop: '4px', lineHeight: '1.3' }}>
                          <span style={{ display: 'block', fontWeight: '500', color: 'var(--text-secondary)' }}>Why selected:</span>
                          Highest fee share among all registered validators.
                        </div>
                      )}
                    </td>
                    <td className={isHighShare ? 'text-bold-white' : ''}>
                      {sharePct.toFixed(1)}%
                    </td>
                    <td>
                      {getEstimatedAPY(sharePct)}
                    </td>
                    <td>
                      {val.shareCount > 0 ? val.shareCount : 'Waiting for first fee-share'}
                    </td>
                    <td>
                      <span className={isActive ? 'text-bold-white' : 'text-inactive'}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '10px' }}>
        <button className="btn btn-secondary" onClick={handleRefresh} style={{ width: 'auto' }} disabled={loading || isRetrying}>
          Refresh
        </button>
      </div>
    </div>

    <div className="card">
      <div className="card-title">Protocol Status</div>
      {validators.length === 0 ? (
        <div style={{ color: '#eab308', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ⚠ No validators registered yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#10b981' }}>✔</span> Validator Registry Connected
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#10b981' }}>✔</span> {validators.length} {validators.length === 1 ? 'Validator' : 'Validators'} Registered
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#10b981' }}>✔</span> Maximum Fee Share
            </div>
            <span style={{ fontWeight: '600', color: 'var(--text-bright, #fff)' }}>{highestShare.toFixed(0)}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#10b981' }}>✔</span> Ready to Accept Deposits
          </div>
        </div>
      )}
    </div>
  </>
);
};

export default ValidatorLeaderboard;
