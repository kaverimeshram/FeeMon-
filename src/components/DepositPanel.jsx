import React, { useState, useEffect } from 'react';
import { createWalletClient, custom, parseEther } from 'viem';
import { monadTestnet, publicClient } from '../lib/viem';
import { FEEMON_ADDRESS, FEEMON_ABI } from '../lib/contracts';
import useWallet from '../hooks/useWallet';
import useProtocolStats from '../hooks/useProtocolStats';

export const DepositPanel = () => {
  const {
    isConnected,
    monBalance,
    isWrongNetwork,
    connectWallet,
    refreshBalances,
    notifyDepositSuccess,
    userDelegation,
  } = useWallet();

  const { exchangeRate } = useProtocolStats();

  const [amount, setAmount] = useState('');
  const [preview, setPreview] = useState('0.0000');
  const [status, setStatus] = useState({ type: '', message: '', hash: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [txState, setTxState] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);
  const [bestValidator, setBestValidator] = useState({ id: 1, feeSharePct: 40 });

  useEffect(() => {
    const fetchValidators = async () => {
      try {
        const response = await fetch('http://localhost:3001/validators');
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            const best = data.reduce((max, v) => {
              return (v.feeSharePct || 0) > (max.feeSharePct || 0) ? v : max;
            }, data[0]);
            setBestValidator({ id: best.id, feeSharePct: best.feeSharePct });
          }
        }
      } catch (err) {
        console.warn('Failed to fetch best validator for DepositPanel:', err);
      }
    };
    fetchValidators();
  }, []);

  // Update preview fMON amount when input or exchange rate changes
  useEffect(() => {
    const inputVal = parseFloat(amount);
    const rateVal = parseFloat(exchangeRate) || 1.0;
    if (isNaN(inputVal) || inputVal <= 0) {
      setPreview('0.0000');
    } else {
      setPreview((inputVal / rateVal).toFixed(4));
    }
  }, [amount, exchangeRate]);

  // Reset button state helper after 10s max (loading state timeout)
  useEffect(() => {
    if (isProcessing) {
      const timer = setTimeout(() => {
        setIsProcessing(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isProcessing]);

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!isConnected) {
      await connectWallet();
      return;
    }

    const inputVal = parseFloat(amount);
    if (isNaN(inputVal) || inputVal < 0.1) {
      setStatus({ type: 'error', message: 'Minimum deposit is 0.1 MON.', hash: '' });
      return;
    }

    if (parseFloat(monBalance) < inputVal) {
      setStatus({ type: 'error', message: 'Insufficient MON balance.', hash: '' });
      return;
    }

    setIsProcessing(true);
    setStatus({ type: '', message: '', hash: '' });

    try {
      const walletClient = createWalletClient({
        chain: monadTestnet,
        transport: custom(window.ethereum),
      });

      const [userAddress] = await walletClient.getAddresses();

      const stakedAmount = amount;

      const hash = await walletClient.writeContract({
        address: FEEMON_ADDRESS,
        abi: FEEMON_ABI,
        functionName: 'deposit',
        account: userAddress,
        value: parseEther(amount),
      });

      setStatus({
        type: 'success',
        message: 'Transaction submitted. Confirming...',
        hash: hash,
      });

      // Reset amount input
      setAmount('');

      // Wait for block confirmation receipt using publicClient
      setTxState('confirming');
      await publicClient.waitForTransactionReceipt({ hash });
      
      setTxState('confirmed');
      const rateVal = parseFloat(exchangeRate) || 1.0;
      const calculatedShares = (parseFloat(stakedAmount) / rateVal).toFixed(4);
      setSuccessInfo({
        amount: stakedAmount,
        shares: calculatedShares,
        validatorId: userDelegation?.validatorId ? Number(userDelegation.validatorId) : 1
      });

      setStatus({
        type: 'success',
        message: 'Staked successfully!',
        hash: hash,
      });

      // Refresh balances and protocol stats
      await refreshBalances();
      if (notifyDepositSuccess) {
        notifyDepositSuccess();
      }

      setTimeout(() => {
        setTxState('');
      }, 2000);

    } catch (err) {
      setTxState('');
      // Check for user rejection
      const errorText = `${err?.message || ''} ${err?.details || ''} ${err?.shortMessage || ''}`.toLowerCase();
      const isUserRejected = err?.code === 4001 || errorText.includes('user rejected') || errorText.includes('user denied');

      if (isUserRejected) {
        console.info('Deposit transaction cancelled by user.');
        setStatus({
          type: 'error',
          message: 'Transaction cancelled.',
          hash: '',
        });
      } else {
        console.error('Deposit transaction error:', err);
        setStatus({
          type: 'error',
          message: 'Transaction failed. Check Monad explorer for details.',
          hash: '',
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const isInsufficient = isConnected && amount && parseFloat(monBalance) < parseFloat(amount);
  const isMinInvalid = amount && parseFloat(amount) < 0.1;
  const isWrongNetworkDisabled = isWrongNetwork;

  // Determine button label
  let buttonText = 'Deposit MON';
  if (!isConnected) {
    buttonText = 'Connect Wallet';
  } else if (isWrongNetworkDisabled) {
    buttonText = 'Wrong Network';
  } else if (txState === 'confirming') {
    buttonText = 'Confirming...';
  } else if (txState === 'confirmed') {
    buttonText = 'Confirmed ✓';
  } else if (isProcessing) {
    buttonText = 'Processing...';
  }

  return (
    <div className="card">
      <div className="card-title">Stake MON</div>
      <div className="card-desc">
        Deposit MON, receive fMON. Earn block rewards and shared priority fees.
      </div>

      <div className="apy-comparison-wrapper">
        <div className="apy-box apy-box-plain">
          <span className="apy-box-label">Plain staking</span>
          <span className="apy-box-value">~12% APY</span>
          <span className="apy-box-desc">Block rewards only</span>
        </div>

        <span className="apy-arrow">→</span>

        <div className="apy-box apy-box-feemon" style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', textAlign: 'center' }}>
          <span className="apy-box-label">feeMON</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #8b8b8f)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Base Staking Yield</span>
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold' }}>+</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #8b8b8f)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Validator Fee Sharing</span>
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold' }}>=</span>
          <span className="apy-box-value" style={{ fontSize: '0.95rem', margin: '2px 0' }}>Estimated Higher Yield</span>
        </div>
      </div>

      <form onSubmit={handleDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="deposit-amount">
            Amount in MON (min 0.1)
          </label>
          <div className="input-wrapper">
            <input
              id="deposit-amount"
              type="number"
              step="any"
              min="0.1"
              className="form-input"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isProcessing || isWrongNetworkDisabled || txState === 'confirming' || txState === 'confirmed'}
            />
          </div>
          <div className="form-preview-text" style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '8px' }}>
            <span style={{ color: 'var(--text-muted, #8b8b8f)', fontSize: '0.85rem' }}>You will receive</span>
            <span style={{ fontWeight: '700', fontSize: '1.25rem', color: 'var(--text-bright, #fff)' }}>
              {parseFloat(preview || 0).toFixed(4)} fMON
            </span>
          </div>
          <div style={{ marginTop: '15px', borderTop: '1px solid #222', paddingTop: '12px' }}>
            <div style={{ fontWeight: '600', color: 'var(--text-secondary, #eee)', fontSize: '0.9rem', marginBottom: '8px' }}>
              Where your stake goes
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted, #8b8b8f)' }}>Validator</span>
              <span style={{ fontWeight: '600', color: 'var(--text-bright, #fff)' }}>Validator #{bestValidator.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted, #8b8b8f)' }}>Reason</span>
              <span style={{ fontWeight: '600', color: '#10b981' }}>Highest fee share ({bestValidator.feeSharePct}%)</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #8b8b8f)', lineHeight: '1.4', margin: '8px 0 0 0' }}>
              "Your MON will automatically be delegated to the validator currently offering the highest fee-sharing commitment. You receive fMON immediately while your stake begins earning both staking rewards and shared priority fees."
            </p>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isProcessing || isWrongNetworkDisabled || isInsufficient || isMinInvalid || txState === 'confirming' || txState === 'confirmed'}
          style={{ width: '100%' }}
        >
          {buttonText}
        </button>

        {isInsufficient && (
          <div className="form-status-msg" style={{ color: '#ef4444' }}>
            Insufficient MON balance.
          </div>
        )}

        {status.message && (
          <div className="form-status-msg">
            {status.message}
            {status.hash && (
              <div style={{ marginTop: '8px' }}>
                <a
                  href={`https://testnet.monadexplorer.com/tx/${status.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'underline', wordBreak: 'break-all' }}
                >
                  View on Monad Explorer
                </a>
              </div>
            )}
          </div>
        )}

        {successInfo && (
          <div style={{
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '8px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '0.9rem',
            color: 'var(--text-bright, #fff)',
            marginTop: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> Deposited {parseFloat(successInfo.amount).toFixed(1)} MON
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> Minted {parseFloat(successInfo.shares).toFixed(1)} fMON
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> Delegated to Validator #{successInfo.validatorId}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓</span> Earning block rewards + priority fee sharing
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default DepositPanel;
