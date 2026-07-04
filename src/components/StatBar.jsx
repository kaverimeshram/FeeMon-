import React, { useState, useEffect } from 'react';
import useWallet from '../hooks/useWallet';
import useProtocolStats from '../hooks/useProtocolStats';

export const StatBar = ({ exchangeRateProp, rateIncreased }) => {
  const { isConnected, monBalance, fmonBalance } = useWallet();
  const { exchangeRate: contextRate } = useProtocolStats();

  const exchangeRate = exchangeRateProp !== undefined ? exchangeRateProp : contextRate;
  const rate = parseFloat(exchangeRate) || 1.0;
  const fmon = parseFloat(fmonBalance) || 0.0;
  const pendingRewards = isConnected ? Math.max(0, fmon * (rate - 1.0)).toFixed(4) : '0.0000';

  const [prevRate, setPrevRate] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (prevRate !== null && exchangeRate !== prevRate) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
    setPrevRate(exchangeRate);
  }, [exchangeRate, prevRate]);

  return (
    <div className="dashboard-stats-bar" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
      <div className="dashboard-stat-box">
        <div className="stat-label">Your MON Balance</div>
        <div className="stat-val">
          {isConnected ? parseFloat(monBalance).toFixed(4) : '0.0000'} MON
        </div>
      </div>
      <div className="dashboard-stat-box">
        <div className="stat-label">Your fMON Balance</div>
        <div className="stat-val">
          {isConnected ? parseFloat(fmonBalance).toFixed(4) : '0.0000'} fMON
        </div>
      </div>
      <div className="dashboard-stat-box" id="exchange-rate-box">
        <div className="stat-label">fMON Exchange Rate</div>
        <div className="stat-val" style={{
          transition: 'color 0.5s ease, transform 0.5s ease',
          color: isAnimating ? '#10b981' : 'var(--text-bright, #fff)',
          transform: isAnimating ? 'scale(1.05)' : 'scale(1)',
          display: 'flex',
          alignItems: 'center'
        }}>
          {parseFloat(exchangeRate).toFixed(4)}
          {rateIncreased && (
            <span style={{ color: '#10b981', marginLeft: '6px', fontSize: '1.2rem', fontWeight: 'bold' }}>↑</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatBar;
