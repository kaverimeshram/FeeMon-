import React from 'react';
import { Link } from 'react-router-dom';
import Nav from '../components/Nav';
import useValidators from '../hooks/useValidators';
import useProtocolStats from '../hooks/useProtocolStats';

export const Landing = () => {
  const { stats, isOffline } = useValidators();
  const { exchangeRate } = useProtocolStats();

  return (
    <>
      <Nav />

      <main>
        <section className="hero-container">
          <h1 className="hero-title">
            The first fee-sharing
            <br />
            <span style={{ whiteSpace: 'nowrap' }}>liquid staking protocol</span>
            <br />
            on <span style={{ color: '#7151d5' }}>Monad</span>
          </h1>
          <p className="hero-subtitle">
            Monad validators earn priority fees on every transaction.
            Delegators receive none of it. feeMON activates Monad's
            native externalReward() mechanism - creating a marketplace
            where validators compete for stake by sharing fees on-chain.
          </p>
          <div className="hero-actions">
            <Link to="/dashboard" className="btn btn-primary">
              Start Staking
            </Link>
            <Link to="/docs" className="btn btn-secondary">
              Read the Docs
            </Link>
          </div>
        </section>

        {/* Stats Row */}
        <section className="stats-row">
          <div className="stat-col">
            <span className="stat-label">Total Staked</span>
            <span className="stat-val">{stats.totalStaked}</span>
          </div>
          <div className="stat-col">
            <span className="stat-label">Active Validators</span>
            <span className="stat-val">{stats.activeValidators}</span>
          </div>
          <div className="stat-col">
            <span className="stat-label">Avg Fee Share</span>
            <span className="stat-val">{stats.avgFeeShare}</span>
          </div>
          <div className="stat-col">
            <span className="stat-label">fMON Rate</span>
            <span className="stat-val">{parseFloat(exchangeRate).toFixed(4)}</span>
          </div>
        </section>

        {/* How It Works */}
        <section className="how-it-works-section">
          <h2 className="section-title">How It Works</h2>
          <div className="how-it-works-grid">
            <div className="step-card">
              <span className="step-number">1.</span>
              <span className="step-title">Deposit MON</span>
              <p className="step-desc">
                Receive fMON at the current exchange rate.
              </p>
            </div>
            <div className="step-card">
              <span className="step-number">2.</span>
              <span className="step-title">Protocol delegates</span>
              <p className="step-desc">
                Your stake is delegated to fee-sharing validators only.
              </p>
            </div>
            <div className="step-card">
              <span className="step-number">3.</span>
              <span className="step-title">Earn more</span>
              <p className="step-desc">
                Validators share priority fees. Your fMON appreciates.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer-container">
        <span className="footer-text">
          feeMON · Built on Monad · Powered by externalReward()
        </span>
      </footer>
    </>
  );
};

export default Landing;
