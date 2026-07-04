import React, { useState, useEffect } from 'react';
import Nav from '../components/Nav';
import StatBar from '../components/StatBar';
import DepositPanel from '../components/DepositPanel';
import WithdrawPanel from '../components/WithdrawPanel';
import ValidatorLeaderboard from '../components/ValidatorLeaderboard';
import AIAdvisor from '../components/AIAdvisor';
import UnclaimedRewardsCard from '../components/UnclaimedRewardsCard';
import useWallet from '../hooks/useWallet';
import { getValidatorName, FEEMON_ADDRESS, FEEMON_ABI } from '../lib/contracts';
import { publicClient } from '../lib/viem';
import { formatEther } from 'viem';

export const Dashboard = () => {
  const { isConnected, fmonBalance, userDelegation } = useWallet();
  const showDelegation = isConnected && parseFloat(fmonBalance) > 0;

  const [exchangeRate, setExchangeRate] = useState('1.0000');
  const [initialRate, setInitialRate] = useState(null);
  const [rateIncreased, setRateIncreased] = useState(false);

  // Poll exchangeRate() every 15 seconds
  useEffect(() => {
    const fetchRate = async (isInitial = false) => {
      try {
        const rateWei = await publicClient.readContract({
          address: FEEMON_ADDRESS,
          abi: FEEMON_ABI,
          functionName: 'exchangeRate',
        });
        const parsed = parseFloat(formatEther(rateWei)).toFixed(4);
        setExchangeRate(parsed);
        if (isInitial) {
          setInitialRate(parsed);
        } else if (initialRate !== null && parseFloat(parsed) > parseFloat(initialRate)) {
          setRateIncreased(true);
        }
      } catch (err) {
        console.warn('Failed to fetch exchange rate:', err);
      }
    };

    fetchRate(true);

    const interval = setInterval(() => {
      fetchRate(false);
    }, 15000);

    return () => clearInterval(interval);
  }, [initialRate]);

  return (
    <>
      <Nav />

      <main style={{ marginTop: '20px' }}>
        <div className="dashboard-container">
          <StatBar exchangeRateProp={exchangeRate} rateIncreased={rateIncreased} />

          {showDelegation && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-title">Your Delegation</div>
              <div className="card-desc" style={{ marginBottom: '15px' }}>
                feeMON automatically delegates your stake to the validator with the strongest fee-sharing policy.
              </div>

              {userDelegation && userDelegation.validatorId > 0n ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted, #8b8b8f)', fontSize: '0.9rem' }}>Current Validator</span>
                    <span style={{ fontWeight: '600', color: 'var(--text-bright, #fff)' }}>Validator #{userDelegation.validatorId.toString()}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted, #8b8b8f)', fontSize: '0.9rem' }}>Reason Selected</span>
                    <span style={{ fontWeight: '600', color: 'var(--text-bright, #fff)' }}>⭐ Highest fee share ({userDelegation.feeSharePct}%)</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted, #8b8b8f)', fontSize: '0.9rem' }}>Delegated Amount</span>
                    <span style={{ fontWeight: '600', color: 'var(--text-bright, #fff)' }}>{parseFloat(userDelegation.amount || 0).toFixed(4)} MON</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted, #8b8b8f)', fontSize: '0.9rem' }}>Current fMON</span>
                    <span style={{ fontWeight: '600', color: 'var(--text-bright, #fff)' }}>{parseFloat(userDelegation.fmonBalance || 0).toFixed(4)} fMON</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted, #8b8b8f)', fontSize: '0.9rem' }}>Current Fee Share</span>
                    <span style={{ fontWeight: '600', color: 'var(--text-bright, #fff)' }}>{userDelegation.feeSharePct}%</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted, #8b8b8f)', fontSize: '0.9rem' }}>Status</span>
                    <span style={{ fontWeight: '600', color: '#10b981' }}>Active</span>
                  </div>

                  <div style={{ marginTop: '8px', borderTop: '1px solid #222', paddingTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted, #8b8b8f)', lineHeight: '1.4' }}>
                    "feeMON continuously monitors validator fee-sharing performance. If another validator consistently provides better rewards, future deposits can be directed there."
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted, #8b8b8f)', fontSize: '0.95rem', textAlign: 'center', padding: '10px 0' }}>
                  No active delegation. Deposit MON to start.
                </div>
              )}
            </div>
          )}

          <div className="dashboard-grid">
            <div className="dashboard-left">
              <DepositPanel />
              
              <div className="card" style={{ marginTop: '0px' }}>
                <div className="card-title">What is fMON?</div>
                <div className="card-desc" style={{ marginTop: '10px' }}>
                  <p style={{ color: 'var(--text-secondary, #eee)', fontSize: '0.9rem', marginBottom: '12px' }}>
                    fMON is your liquid staking receipt.
                  </p>
                  <p style={{ color: 'var(--text-muted, #8b8b8f)', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '500' }}>
                    When you stake MON:
                  </p>
                  <ul style={{ paddingLeft: '15px', margin: '0', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)', listStyleType: 'disc', fontSize: '0.85rem' }}>
                    <li>Your MON is delegated to a fee-sharing validator.</li>
                    <li>You immediately receive fMON.</li>
                    <li>fMON represents your ownership of the staked MON.</li>
                    <li>Your fMON gradually becomes more valuable as rewards accumulate.</li>
                    <li>You can later redeem fMON to withdraw your MON.</li>
                  </ul>
                </div>
              </div>

              <WithdrawPanel />
            </div>

            <div className="dashboard-right">
              <UnclaimedRewardsCard />
              <ValidatorLeaderboard />
              <AIAdvisor />
            </div>
          </div>
        </div>
      </main>

      <footer className="footer-container">
        <span className="footer-text">
          feeMON · Built on Monad · Powered by externalReward()
        </span>
      </footer>
    </>
  );
};

export default Dashboard;
