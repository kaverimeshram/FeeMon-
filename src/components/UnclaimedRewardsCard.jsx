import React, { useState, useEffect } from 'react';
import { createWalletClient, custom } from 'viem';
import { monadTestnet, publicClient } from '../lib/viem';
import { FEEMON_ADDRESS, FEEMON_ABI } from '../lib/contracts';
import useWallet from '../hooks/useWallet';

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b8b8f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const GiftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
    <polyline points="20 12 20 22 4 22 4 12"></polyline>
    <rect x="2" y="7" width="20" height="5"></rect>
    <line x1="12" y1="22" x2="12" y2="7"></line>
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
  </svg>
);

export const UnclaimedRewardsCard = () => {
  const {
    isConnected,
    refreshBalances,
    unclaimedRewards,
    setUnclaimedRewards,
    validatorsSharingFees,
    totalFeesShared,
    lastHarvest
  } = useWallet();

  const [harvestState, setHarvestState] = useState('idle'); // idle | harvesting | success
  const [displayRewards, setDisplayRewards] = useState('0.0000');
  const [showTooltip, setShowTooltip] = useState(false);
  const [toast, setToast] = useState('');

  // Synchronize display rewards with unclaimedRewards context when not harvesting
  useEffect(() => {
    if (harvestState === 'idle') {
      setDisplayRewards(unclaimedRewards);
    }
  }, [unclaimedRewards, harvestState]);

  const handleHarvest = async () => {
    if (!isConnected) return;
    setHarvestState('harvesting');

    try {
      const walletClient = createWalletClient({
        chain: monadTestnet,
        transport: custom(window.ethereum)
      });
      const [userAddress] = await walletClient.getAddresses();

      const hash = await walletClient.writeContract({
        address: FEEMON_ADDRESS,
        abi: FEEMON_ABI,
        functionName: 'harvestAll',
        account: userAddress
      });

      // Wait for block receipt
      await publicClient.waitForTransactionReceipt({ hash });

      // Animate countdown of rewards to 0
      const startVal = parseFloat(displayRewards) || 0;
      const startTime = Date.now();
      const duration = 800; // 0.8s countdown

      const tick = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = startVal * (1 - progress);
        setDisplayRewards(current.toFixed(4));
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          setDisplayRewards('0.0000');
          setUnclaimedRewards('0.0000');
          setHarvestState('idle');
          
          // Flash exchange rate card
          const rateBox = document.getElementById('exchange-rate-box');
          if (rateBox) {
            rateBox.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
            rateBox.style.transform = 'scale(1.03)';
            setTimeout(() => {
              rateBox.style.backgroundColor = 'transparent';
              rateBox.style.transform = 'scale(1)';
            }, 1000);
          }

          // Show Toast notification
          setToast('Rewards successfully compounded.');
          setTimeout(() => setToast(''), 4000);

          // Trigger refresh of stats
          refreshBalances();
        }
      };
      requestAnimationFrame(tick);

    } catch (err) {
      console.error('[Harvest] Transaction failed:', err);
      setHarvestState('idle');
    }
  };

  const hasRewards = parseFloat(displayRewards) > 0;
  const isHarvesting = harvestState === 'harvesting';

  // Subtle glow when rewards are available
  const cardStyle = {
    transition: 'border-color 0.5s ease, box-shadow 0.5s ease',
    ...(hasRewards && !isHarvesting ? {
      borderColor: 'rgba(16, 185, 129, 0.3)',
      boxShadow: '0 0 15px rgba(16, 185, 129, 0.08)'
    } : {})
  };

  return (
    <div className="card" style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="card-title">Unclaimed Fee Rewards</span>
            
            {/* Info Tooltip */}
            <div style={{ position: 'relative', display: 'inline-block', height: '18px' }}>
              <span 
                style={{ 
                  cursor: 'pointer', 
                  color: 'var(--text-muted, #8b8b8f)', 
                  fontSize: '0.72rem', 
                  border: '1px solid var(--border, #2e303a)',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '500'
                }}
                id="rewards-tooltip-trigger"
                onClick={() => setShowTooltip(prev => !prev)}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                i
              </span>
              {showTooltip && (
                <div style={{
                  position: 'absolute',
                  top: '24px',
                  left: '-120px',
                  width: '280px',
                  backgroundColor: '#16171d',
                  border: '1px solid var(--border, #2e303a)',
                  borderRadius: '8px',
                  padding: '12px',
                  zIndex: 100,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                  color: 'var(--text-secondary, #9ca3af)',
                  fontSize: '0.78rem',
                  lineHeight: '1.45',
                  textAlign: 'left'
                }}>
                  <strong style={{ color: 'var(--text-bright, #fff)', display: 'block', marginBottom: '6px' }}>What are Fee Rewards?</strong>
                  Validators on Monad earn priority transaction fees.
                  Validators participating in feeMON voluntarily share a percentage of those fees with delegators.
                  <br /><br />
                  These shared fees accumulate here until they are harvested.
                  <br /><br />
                  Harvesting does <strong>NOT</strong> mint more fMON.
                  <br /><br />
                  Instead, it increases the value of every existing fMON by increasing the exchange rate.
                </div>
              )}
            </div>
          </div>
          <div className="card-desc" style={{ marginTop: '4px', fontSize: '0.85rem' }}>
            Priority fees shared by validators that have not yet been compounded into the fMON exchange rate.
          </div>
        </div>
      </div>

      <div style={{ margin: '10px 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {/* Large Value display */}
        <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-bright, #fff)' }}>
          {displayRewards} MON
        </div>

        {/* State 3: Harvesting */}
        {isHarvesting && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-bright)' }}>
              <span className="spinner" style={{
                display: 'inline-block',
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255,255,255,0.1)',
                borderTopColor: 'var(--accent, #c084fc)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></span>
              <span>Harvesting rewards...</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #8b8b8f)', lineHeight: '1.3' }}>
              Please wait while feeMON compounds validator fee-sharing rewards.
            </div>
          </div>
        )}

        {/* State 2: Rewards Available */}
        {!isHarvesting && hasRewards && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                fontSize: '0.75rem',
                fontWeight: '600',
                padding: '4px 10px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center'
              }}>
                <GiftIcon />
                Ready to Harvest
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #9ca3af)', lineHeight: '1.3' }}>
              Validators have shared priority fees. Harvest to compound them into the fMON exchange rate.
            </div>
            <button className="btn btn-primary" onClick={handleHarvest} style={{ width: '100%' }}>
              Harvest Rewards
            </button>
          </div>
        )}

        {/* State 1: Default / No Rewards */}
        {!isHarvesting && !hasRewards && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #9ca3af)' }}>
              No validator has shared priority fees yet.
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #8b8b8f)', display: 'flex', alignItems: 'center' }}>
              <ClockIcon />
              Rewards appear after validators call externalReward().
            </div>
          </div>
        )}
      </div>

      {/* Protocol Metrics */}
      <div style={{ borderTop: '1px solid var(--border, #2e303a)', paddingTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
          <span style={{ color: 'var(--text-muted, #8b8b8f)' }}>Validators Sharing Fees</span>
          <span style={{ fontWeight: '500', color: 'var(--text-bright, #fff)' }}>{validatorsSharingFees}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
          <span style={{ color: 'var(--text-muted, #8b8b8f)' }}>Total Fees Shared</span>
          <span style={{ fontWeight: '500', color: 'var(--text-bright, #fff)' }}>{parseFloat(totalFeesShared).toFixed(4)} MON</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
          <span style={{ color: 'var(--text-muted, #8b8b8f)' }}>Last Harvest</span>
          <span style={{ fontWeight: '500', color: 'var(--text-bright, #fff)' }}>{lastHarvest}</span>
        </div>
      </div>

      {/* Success Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#10b981',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
          zIndex: 1000,
          fontSize: '0.9rem',
          fontWeight: '500'
        }}>
          ✓ {toast}
        </div>
      )}
    </div>
  );
};

export default UnclaimedRewardsCard;
