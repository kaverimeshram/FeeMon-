import React from 'react';
import { Link } from 'react-router-dom';
import useWallet from '../hooks/useWallet';

export const Nav = () => {
  const {
    address,
    monBalance,
    isWrongNetwork,
    isConnected,
    isLoading,
    connectWallet,
    switchNetwork,
  } = useWallet();

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header style={{ width: '100%' }}>
      {isWrongNetwork && (
        <div className="network-banner">
          <span>Switch to Monad Testnet to continue.</span>
          <button onClick={switchNetwork}>Switch Network</button>
        </div>
      )}

      <nav className="nav-container">
        <Link to="/" className="nav-brand">
          feeMON
        </Link>

        <div className="nav-links">
          <Link to="/dashboard" className="nav-link">
            Dashboard
          </Link>
          <Link to="/docs" className="nav-link">
            Docs
          </Link>
          <a
            href="https://github.com/feemon-protocol"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
          >
            GitHub
          </a>

          {isConnected && address ? (
            <span className="nav-wallet-info">
              <span style={{ color: 'var(--text-primary)', fontSize: '0.75rem', opacity: 0.8 }}>●</span> {formatAddress(address)} | {parseFloat(monBalance).toFixed(2)} MON
            </span>
          ) : (
            <button className="btn btn-secondary" onClick={connectWallet} disabled={isLoading}>
              {isLoading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Nav;
