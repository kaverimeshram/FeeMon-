import React, { useState, useEffect, useCallback } from 'react';
import { createWalletClient, custom, parseEther, formatEther } from 'viem';
import { monadTestnet, publicClient } from '../lib/viem';
import { FEEMON_ADDRESS, FEEMON_ABI } from '../lib/contracts';
import useWallet from '../hooks/useWallet';
import useProtocolStats from '../hooks/useProtocolStats';

export const WithdrawPanel = () => {
  const {
    isConnected,
    address,
    monBalance,
    fmonBalance,
    isWrongNetwork,
    connectWallet,
    refreshBalances,
    setMonBalance,
    setFmonBalance,
  } = useWallet();

  const { exchangeRate } = useProtocolStats();

  const [fmonAmount, setFmonAmount] = useState('');
  const [validatorId, setValidatorId] = useState('');
  const [preview, setPreview] = useState('0.0000');
  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isActionProcessing, setIsActionProcessing] = useState(null); // stores index of request being processed
  const [status, setStatus] = useState({ type: '', message: '', hash: '' });

  // Calculate preview MON (fMON amount * exchangeRate)
  useEffect(() => {
    const inputVal = parseFloat(fmonAmount);
    const rateVal = parseFloat(exchangeRate) || 1.0;
    if (isNaN(inputVal) || inputVal <= 0) {
      setPreview('0.0000');
    } else {
      setPreview((inputVal * rateVal).toFixed(4));
    }
  }, [fmonAmount, exchangeRate]);

  // Fetch pending/past withdrawals from contract
  const fetchWithdrawRequests = useCallback(async () => {
    if (!isConnected || !address) {
      setWithdrawRequests([]);
      return;
    }
    const isZero = !FEEMON_ADDRESS || FEEMON_ADDRESS === '0x0000000000000000000000000000000000000000';
    if (isZero) {
      return;
    }
    try {
      const requests = await publicClient.readContract({
        address: FEEMON_ADDRESS,
        abi: FEEMON_ABI,
        functionName: 'getWithdrawRequests',
        args: [address],
      });
      // Convert readonly contract array of tuples to standard js objects
      if (requests) {
        const parsed = requests.map((req, idx) => ({
          index: idx,
          amount: formatEther(req.amount),
          validatorId: req.validatorId.toString(),
          withdrawId: req.withdrawId,
          claimed: req.claimed,
        }));
        setWithdrawRequests(parsed);
      }
    } catch (err) {
      console.warn('Error reading withdrawal requests from chain:', err);
    }
  }, [isConnected, address]);

  // Initial fetch and periodic polling
  useEffect(() => {
    fetchWithdrawRequests();
    const interval = setInterval(fetchWithdrawRequests, 30000);
    return () => clearInterval(interval);
  }, [fetchWithdrawRequests]);

  // Submit request withdrawal
  const handleRequestWithdraw = async (e) => {
    e.preventDefault();
    if (!isConnected) {
      await connectWallet();
      return;
    }

    const inputAmount = parseFloat(fmonAmount);
    const valId = parseInt(validatorId, 10);

    if (isNaN(inputAmount) || inputAmount <= 0) {
      setStatus({ type: 'error', message: 'Enter a valid fMON amount.', hash: '' });
      return;
    }

    if (parseFloat(fmonBalance) < inputAmount) {
      setStatus({ type: 'error', message: 'Insufficient fMON balance.', hash: '' });
      return;
    }

    if (isNaN(valId) || valId < 0) {
      setStatus({ type: 'error', message: 'Enter a valid Validator ID.', hash: '' });
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

      const hash = await walletClient.writeContract({
        address: FEEMON_ADDRESS,
        abi: FEEMON_ABI,
        functionName: 'requestWithdraw',
        account: userAddress,
        args: [parseEther(fmonAmount), BigInt(validatorId)],
      });

      setStatus({
        type: 'success',
        message: 'Withdrawal request submitted successfully.',
        hash: hash,
      });

      setFmonAmount('');
      setValidatorId('');

      // Refresh data
      setTimeout(() => {
        refreshBalances();
        fetchWithdrawRequests();
      }, 4000);

    } catch (err) {
      console.error('Request withdraw transaction error:', err);
      if (err.message && (err.message.includes('User rejected') || err.code === 4001)) {
        setStatus({ type: 'error', message: 'Transaction cancelled.', hash: '' });
      } else {
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

  // Complete withdrawal function
  const handleCompleteWithdraw = async (index) => {
    if (!isConnected || isWrongNetwork) return;

    setIsActionProcessing(index);
    setStatus({ type: '', message: '', hash: '' });

    try {
      const walletClient = createWalletClient({
        chain: monadTestnet,
        transport: custom(window.ethereum),
      });

      const [userAddress] = await walletClient.getAddresses();

      const hash = await walletClient.writeContract({
        address: FEEMON_ADDRESS,
        abi: FEEMON_ABI,
        functionName: 'withdraw',
        account: userAddress,
        args: [BigInt(index)],
      });

      setStatus({
        type: 'success',
        message: 'Withdrawal completed successfully.',
        hash: hash,
      });

      setTimeout(() => {
        refreshBalances();
        fetchWithdrawRequests();
      }, 4000);

    } catch (err) {
      console.error('Complete withdraw transaction error:', err);
      if (err.message && (err.message.includes('User rejected') || err.code === 4001)) {
        setStatus({ type: 'error', message: 'Transaction cancelled.', hash: '' });
      } else {
        setStatus({
          type: 'error',
          message: 'Transaction failed. Check Monad explorer for details.',
          hash: '',
        });
      }
    } finally {
      setIsActionProcessing(null);
    }
  };

  const isInsufficient = isConnected && fmonAmount && parseFloat(fmonBalance) < parseFloat(fmonAmount);
  const isWrongNetworkDisabled = isWrongNetwork;

  // Filter only pending/unclaimed or show all? Let's show all and demarcate status.
  const activeRequests = withdrawRequests.filter((r) => !r.claimed);

  return (
    <div className="card">
      <div className="card-title">Withdraw</div>
      <div className="card-desc">
        Burn fMON to receive MON. Withdrawal takes 1 epoch (~5.5 hours).
      </div>

      <form onSubmit={handleRequestWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="form-group">
          <label className="form-label" htmlFor="withdraw-fmon-amount">
            fMON amount to withdraw
          </label>
          <input
            id="withdraw-fmon-amount"
            type="number"
            step="any"
            className="form-input"
            placeholder="0.0"
            value={fmonAmount}
            onChange={(e) => setFmonAmount(e.target.value)}
            disabled={isProcessing || isWrongNetworkDisabled}
          />
          <div className="form-preview-text">
            You will receive {preview} MON
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="withdraw-validator-id">
            Validator ID to undelegate from
          </label>
          <input
            id="withdraw-validator-id"
            type="number"
            className="form-input"
            placeholder="e.g. 1"
            value={validatorId}
            onChange={(e) => setValidatorId(e.target.value)}
            disabled={isProcessing || isWrongNetworkDisabled}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isProcessing || isWrongNetworkDisabled || isInsufficient || !fmonAmount || !validatorId}
          style={{ width: '100%' }}
        >
          {isProcessing ? 'Processing...' : 'Request Withdrawal'}
        </button>

        {isInsufficient && (
          <div className="form-status-msg" style={{ color: '#ef4444' }}>
            Insufficient fMON balance.
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
      </form>

      {/* Pending Withdrawals Table */}
      {isConnected && withdrawRequests.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <div className="card-title" style={{ fontSize: '1.1rem', marginBottom: '12px' }}>
            Withdrawal Requests
          </div>
          <div className="table-wrapper">
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Amount</th>
                  <th>Validator</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {withdrawRequests.map((req) => (
                  <tr key={req.index}>
                    <td>{parseFloat(req.amount).toFixed(4)} fMON</td>
                    <td>Val #{req.validatorId}</td>
                    <td>
                      {req.claimed ? (
                        <span className="text-inactive">Claimed</span>
                      ) : (
                        <span className="text-bold-white">Ready</span>
                      )}
                    </td>
                    <td>
                      {!req.claimed && (
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                          onClick={() => handleCompleteWithdraw(req.index)}
                          disabled={isActionProcessing !== null}
                        >
                          {isActionProcessing === req.index ? 'Claiming...' : 'Complete'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawPanel;
