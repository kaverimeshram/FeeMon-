import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import Nav from '../components/Nav';

// Helper component to render KaTeX formulas
const Formula = ({ formula, block = false }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(formula, containerRef.current, {
          throwOnError: false,
          displayMode: block,
        });
      } catch (err) {
        console.error('KaTeX rendering error:', err);
      }
    }
  }, [formula, block]);

  return <span ref={containerRef} />;
};

// FAQ Accordion Item component
const FAQItem = ({ question, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="faq-item" style={{ borderBottom: '1px solid var(--border)', padding: '16px 0' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          textAlign: 'left',
          color: 'var(--text-primary)',
          fontSize: '1.05rem',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 0,
        }}
      >
        <span>{question}</span>
        <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>
          {isOpen ? '−' : '+'}
        </span>
      </button>
      {isOpen && (
        <div style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.7 }}>
          {children}
        </div>
      )}
    </div>
  );
};

export const Docs = () => {
  // Smooth scroll helper
  const handleScroll = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <Nav />

      <div className="docs-container">
        {/* Sticky Sidebar */}
        <aside className="docs-sidebar">
          <div className="docs-sidebar-title">Documentation</div>
          <ul className="docs-sidebar-links">
            <li><button onClick={() => handleScroll('introduction')}>Introduction</button></li>
            <li><button onClick={() => handleScroll('problem')}>The Problem</button></li>
            <li><button onClick={() => handleScroll('solution')}>The Solution</button></li>
            <li><button onClick={() => handleScroll('architecture')}>Architecture</button></li>
            <li><button onClick={() => handleScroll('contracts')}>Smart Contracts</button></li>
            <li><button onClick={() => handleScroll('monad')}>Monad Integration</button></li>
            <li><button onClick={() => handleScroll('mathematics')}>Mathematics</button></li>
            <li><button onClick={() => handleScroll('ai-advisor')}>AI Advisor</button></li>
            <li><button onClick={() => handleScroll('x402')}>x402 Payments</button></li>
            <li><button onClick={() => handleScroll('security')}>Security</button></li>
            <li><button onClick={() => handleScroll('lifecycle')}>Protocol Lifecycle</button></li>
            <li><button onClick={() => handleScroll('faq')}>FAQ</button></li>
          </ul>
        </aside>

        {/* Scrollable Content */}
        <main className="docs-content">
          
          {/* INTRODUCTION */}
          <section id="introduction" className="docs-section">
            <h1 className="docs-title">Introduction</h1>
            <div className="docs-subtitle">What is feeMON?</div>
            <p>
              feeMON is the first fee-sharing liquid staking protocol built specifically for the Monad blockchain. 
              To understand feeMON, it is best to break down its core concepts into simple parts:
            </p>
            <ul>
              <li>
                <strong>Liquid Staking:</strong> When you stake native blockchain assets (like MON on Monad) directly, 
                your capital is locked up and cannot be used. Liquid staking resolves this by depositing your MON into 
                feeMON and receiving a liquid representation token, <strong>fMON</strong>. You earn rewards while 
                your fMON remains liquid and usable throughout DeFi.
              </li>
              <li>
                <strong>Priority Fees:</strong> On high-throughput networks like Monad, transactions pay gas fees to be 
                included in blocks. Crucially, a validator receives not only standard block emission rewards, but also 
                the priority tips/fees paid by transactions seeking fast execution.
              </li>
              <li>
                <strong>Why Delegators Receive None:</strong> Under native PoS staking, validators receive the priority fees 
                directly into their coinbase account. There is no automated on-chain mechanism to redistribute these fees 
                back to the delegators who supplied the voting stake.
              </li>
              <li>
                <strong>How feeMON Changes This:</strong> feeMON leverages Monad's native <code>externalReward()</code> 
                precompiled hook to create a marketplace where validators must commit to sharing a percentage of their 
                priority fees back to the feeMON pool in order to receive delegations.
              </li>
            </ul>
          </section>

          {/* THE PROBLEM */}
          <section id="problem" className="docs-section">
            <h2 className="docs-section-heading">The Problem</h2>
            <p>
              Under standard staking, validators collect priority fees from users' transactions but keep 100% of these 
              fees. Only baseline block validation emissions are shared with delegators. This leads to an unfair distribution 
              where delegators miss out on high-congestion priority fees.
            </p>
            <div className="docs-code-container">
              <div className="docs-code-header">Current Staking Flow</div>
              <pre className="docs-ascii-art">
{`┌─────────────────────────────────────────────────────────┐
│                          USER                           │
└───────────────────────────┬─────────────────────────────┘
                            │ Delegates MON
                            ▼
┌─────────────────────────────────────────────────────────┐
│                        VALIDATOR                        │
├───────────────────────────┬─────────────────────────────┤
│   Block Rewards (12%)     │     Priority Fees (Gas)     │
├───────────────────────────┼─────────────────────────────┤
│ Shared with Delegator     │ KEPT ENTIRELY BY VALIDATOR  │
│          (fMON)           │        (Delegator = 0)      │
└───────────────────────────┴─────────────────────────────┘`}
              </pre>
            </div>
          </section>

          {/* THE SOLUTION */}
          <section id="solution" className="docs-section">
            <h2 className="docs-section-heading">The Solution</h2>
            <p>
              feeMON solves this by introducing a competitive validator registry. Only validators who agree to share 
              a portion of their priority fees are eligible to receive delegations from the feeMON pool. These priority 
              fees are deposited back into the staking contract via <code>externalReward()</code>, causing the value of 
              fMON to appreciate relative to MON.
            </p>
            <div className="docs-code-container">
              <div className="docs-code-header">feeMON Architecture Flow</div>
              <pre className="docs-ascii-art">
{`┌──────────┐      ┌──────────┐      ┌─────────────┐      ┌───────────────┐
│   User   ├─────►│  feeMON  ├─────►│  Registry   ├─────►│ Best Validator│
└──────────┘      └────┬─────┘      └─────────────┘      └───────┬───────┘
                       │                                         │
                       │   Appreciates                           ▼
                       │   Exchange Rate                 ┌───────────────┐
                       │                                 │ Monad Staking │
                       │◄────────────────────────────────┼───────────────┤
                       │       externalReward() (Fees)   │   Precompile  │
                       └─────────────────────────────────┴───────────────┘`}
              </pre>
            </div>
          </section>

          {/* ARCHITECTURE */}
          <section id="architecture" className="docs-section">
            <h2 className="docs-section-heading">Architecture</h2>
            <p>
              Below is the comprehensive architecture diagram showing how funds flow from a user's wallet through the 
              feeMON smart contracts to the precompiled Monad staking engine.
            </p>
            
            <div className="docs-flow-grid">
              <div className="docs-flow-card">
                <span className="docs-flow-tag">UI</span>
                <span className="docs-flow-name">Wallet</span>
              </div>
              <div className="docs-flow-arrow">→</div>
              <div className="docs-flow-card">
                <span className="docs-flow-tag">ERC4626</span>
                <span className="docs-flow-name">FeeMON Contract</span>
              </div>
              <div className="docs-flow-arrow">→</div>
              <div className="docs-flow-card">
                <span className="docs-flow-tag">Registry</span>
                <span className="docs-flow-name">Validator Registry</span>
              </div>
              <div className="docs-flow-arrow">→</div>
              <div className="docs-flow-card">
                <span className="docs-flow-tag">Precompile</span>
                <span className="docs-flow-name">Staking (0x1000)</span>
              </div>
              <div className="docs-flow-arrow">→</div>
              <div className="docs-flow-card">
                <span className="docs-flow-tag">PoS</span>
                <span className="docs-flow-name">Validator Node</span>
              </div>
              <div className="docs-flow-arrow">→</div>
              <div className="docs-flow-card">
                <span className="docs-flow-tag">Hook</span>
                <span className="docs-flow-name">externalReward()</span>
              </div>
            </div>
          </section>

          {/* SMART CONTRACTS */}
          <section id="contracts" className="docs-section">
            <h2 className="docs-section-heading">Smart Contracts</h2>
            
            <h3 className="docs-subsection-title">FeeMON.sol</h3>
            <p>
              The primary yield-bearing contract. It manages deposits, withdrawals, and updates the exchange rate 
              when external fees are harvested.
            </p>

            <ul>
              <li>
                <code>deposit()</code>: Takes MON deposits from the user, calculates fMON to mint using the current 
                exchange rate, and delegates matching MON to registered validators.
              </li>
              <li>
                <code>requestWithdraw(uint256 fmonAmount, uint64 validatorId)</code>: Files a withdrawal request to undelegate 
                MON from a specific validator. Requests take 1 epoch to finalize.
              </li>
              <li>
                <code>withdraw(uint256 requestIndex)</code>: Claims the final MON after the epoch wait has elapsed.
              </li>
            </ul>

            <div className="docs-code-container">
              <div className="docs-code-header">FeeMON.sol - deposit()</div>
              <pre className="docs-code-block">
{`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IFeeMON.sol";

contract FeeMON is ERC20, IFeeMON {
    // Calculates exchange rate and mints fMON
    function deposit() external payable returns (uint256) {
        require(msg.value >= 0.1 ether, "Min deposit 0.1 MON");
        
        uint256 fmonAmount = previewDeposit(msg.value);
        _mint(msg.sender, fmonAmount);
        
        // Delegate to high-scoring validators
        _delegateToRegistry(msg.value);
        
        emit Deposited(msg.sender, msg.value, fmonAmount);
        return fmonAmount;
    }`}
              </pre>
            </div>

            <h3 className="docs-subsection-title" style={{ marginTop: '30px' }}>ValidatorRegistry.sol</h3>
            <p>
              Maintains the list of active fee-sharing validators. Only validators registered here can receive 
              delegations from the pool.
            </p>

            <ul>
              <li>
                <code>register(uint64 validatorId, uint256 minFeeShareBps)</code>: Allows a validator node owner to pledge a minimum percentage share of priority fees.
              </li>
              <li>
                <code>update(uint64 validatorId, uint256 minFeeShareBps)</code>: Updates the fee share pledge (increases take effect immediately; decreases require a delay).
              </li>
            </ul>

            <div className="docs-code-container">
              <div className="docs-code-header">ValidatorRegistry.sol - register()</div>
              <pre className="docs-code-block">
{`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ValidatorRegistry {
    struct Validator {
        uint64 validatorId;
        address authAddress;
        uint256 minFeeShareBps;
        uint256 totalShared;
        bool active;
    }
    
    mapping(uint64 => Validator) public validators;

    function register(uint64 validatorId, uint256 minFeeShareBps) external {
        require(minFeeShareBps <= 10000, "Invalid BPS");
        validators[validatorId] = Validator({
            validatorId: validatorId,
            authAddress: msg.sender,
            minFeeShareBps: minFeeShareBps,
            totalShared: 0,
            active: true
        });
        emit ValidatorRegistered(validatorId, msg.sender, minFeeShareBps);
    }`}
              </pre>
            </div>
          </section>

          {/* MONAD INTEGRATION */}
          <section id="monad" className="docs-section">
            <h2 className="docs-section-heading">Monad Integration</h2>
            <p>
              feeMON integrates directly with Monad's consensus engine to execute Native Staking operations on-chain.
            </p>
            <ul>
              <li>
                <strong>Monad Staking Precompile:</strong> Unlike EVM chains that require external smart contract systems 
                for PoS delegation, Monad implements a native staking engine exposed at the precompiled address 
                <code>0x0000000000000000000000000000000000001000</code>. Smart contracts call this precompile using standard Solidity interfaces.
              </li>
              <li>
                <strong>externalReward():</strong> A built-in function of the precompile. This function allows any 
                validator address to transfer earned rewards directly to a target contract address (in this case, the feeMON contract). 
                Validators trigger <code>externalReward()</code> on-chain, automatically compounding rewards into the feeMON pool without requiring extra manual payouts.
              </li>
            </ul>
          </section>

          {/* MATHEMATICS */}
          <section id="mathematics" className="docs-section">
            <h2 className="docs-section-heading">Mathematics</h2>
            
            {/* Exchange Rate */}
            <div className="math-block-wrapper">
              <h3 className="docs-subsection-title">1. fMON Exchange Rate</h3>
              <p>
                The value of 1 fMON in terms of MON is determined by dividing the total MON controlled by the protocol 
                by the total supply of fMON.
              </p>
              <div className="math-display">
                <Formula formula="ER = \frac{\text{Total MON Managed}}{\text{Total fMON Supply}}" block={true} />
              </div>
              <div className="math-example">
                <strong>Worked Example:</strong> If the feeMON contract holds <Formula formula="10,000 \text{ MON}" /> 
                and has issued <Formula formula="9,500 \text{ fMON}" />:
                <div style={{ marginTop: '8px' }}>
                  <Formula formula="ER = \frac{10,000}{9,500} \approx 1.0526 \text{ MON per fMON}" />
                </div>
              </div>
            </div>

            {/* User Value */}
            <div className="math-block-wrapper">
              <h3 className="docs-subsection-title">2. User Balance Valuation</h3>
              <p>
                A user's position value in native MON is calculated as:
              </p>
              <div className="math-display">
                <Formula formula="\text{User Value} = \text{fMON} \times ER" block={true} />
              </div>
              <div className="math-example">
                <strong>Worked Example:</strong> If you hold <Formula formula="500 \text{ fMON}" /> and the Exchange Rate 
                is <Formula formula="1.0526" />:
                <div style={{ marginTop: '8px' }}>
                  <Formula formula="\text{User Value} = 500 \times 1.0526 = 526.30 \text{ MON}" />
                </div>
              </div>
            </div>

            {/* TVL */}
            <div className="math-block-wrapper">
              <h3 className="docs-subsection-title">3. Total Value Locked (TVL)</h3>
              <p>
                The protocol's total asset footprint includes base user deposits compounded by shared fees:
              </p>
              <div className="math-display">
                <Formula formula="\text{TVL} = \text{Deposits} + \text{Shared Rewards}" block={true} />
              </div>
              <div className="math-example">
                <strong>Worked Example:</strong> With <Formula formula="1,000,000 \text{ MON}" /> deposited and 
                <Formula formula="23,450 \text{ MON}" /> in priority fees shared:
                <div style={{ marginTop: '8px' }}>
                  <Formula formula="\text{TVL} = 1,000,000 + 23,450 = 1,023,450 \text{ MON}" />
                </div>
              </div>
            </div>

            {/* Validator Score */}
            <div className="math-block-wrapper">
              <h3 className="docs-subsection-title">4. Validator Allocation Score</h3>
              <p>
                The protocol weights stake distribution across validators according to their priority fee share, uptime, 
                and reward consistency:
              </p>
              <div className="math-display">
                <Formula formula="\text{Score} = 0.5 \times \text{Fee Share} + 0.3 \times \text{Uptime} + 0.2 \times \text{Consistency}" block={true} />
              </div>
              <div className="math-example">
                <strong>Worked Example:</strong> Validator A offers a <Formula formula="25\%" /> fee share (<Formula formula="0.25" />), 
                has <Formula formula="99\%" /> uptime (<Formula formula="0.99" />), and <Formula formula="95\%" /> reward consistency (<Formula formula="0.95" />):
                <div style={{ marginTop: '8px' }}>
                  <Formula formula="\text{Score} = (0.5 \times 0.25) + (0.3 \times 0.99) + (0.2 \times 0.95) = 0.125 + 0.297 + 0.190 = 0.612" />
                </div>
              </div>
            </div>
          </section>

          {/* AI ADVISOR */}
          <section id="ai-advisor" className="docs-section">
            <h2 className="docs-section-heading">AI Advisor</h2>
            <p>
              feeMON incorporates Claude to guide delegators and optimize validator yield allocation. The AI model operates 
              purely as an analytics engine.
            </p>
            <blockquote>
              <strong>The AI never signs transactions. The AI never controls funds. The AI only explains data.</strong>
            </blockquote>
            <p>
              Claude continuously evaluates performance metrics, flags abnormal behaviors, and reports recommendation feeds 
              to users:
            </p>
            <div className="docs-flow-grid">
              <div className="docs-flow-card">
                <span className="docs-flow-tag">User</span>
                <span className="docs-flow-name">Requests Help</span>
              </div>
              <div className="docs-flow-arrow">→</div>
              <div className="docs-flow-card">
                <span className="docs-flow-tag">Server</span>
                <span className="docs-flow-name">Gathers Metrics</span>
              </div>
              <div className="docs-flow-arrow">→</div>
              <div className="docs-flow-card">
                <span className="docs-flow-tag">Claude</span>
                <span className="docs-flow-name">Generates Review</span>
              </div>
              <div className="docs-flow-arrow">→</div>
              <div className="docs-flow-card">
                <span className="docs-flow-tag">Output</span>
                <span className="docs-flow-name">Display Advice</span>
              </div>
            </div>
          </section>

          {/* x402 PAYMENTS */}
          <section id="x402" className="docs-section">
            <h2 className="docs-section-heading">x402 Payments</h2>
            <p>
              Instead of subscription fees, feeMON premium analytics charges users per-query using 
              <strong>x402 protocol payments</strong>.
            </p>
            <ul>
              <li>Every premium recommendation, validator analysis, or alert query costs exactly <strong>0.001 MON</strong>.</li>
              <li>Transactions are processed directly via your connected Web3 wallet, transferring 0.001 MON to the backend API.</li>
              <li>This pay-per-query model ensures you only pay for what you actually use.</li>
            </ul>
            <div className="docs-flow-grid" style={{ marginTop: '20px' }}>
              <div className="docs-flow-card">
                <span className="docs-flow-tag">User</span>
                <span className="docs-flow-name">Clicks AI Advice</span>
              </div>
              <div className="docs-flow-arrow">→</div>
              <div className="docs-flow-card">
                <span className="docs-flow-tag">x402</span>
                <span className="docs-flow-name">Prompts Wallet</span>
              </div>
              <div className="docs-flow-arrow">→</div>
              <div className="docs-flow-card">
                <span className="docs-flow-tag">Explorer</span>
                <span className="docs-flow-name">Pays 0.001 MON</span>
              </div>
              <div className="docs-flow-arrow">→</div>
              <div className="docs-flow-card">
                <span className="docs-flow-tag">Claude</span>
                <span className="docs-flow-name">Delivers Answer</span>
              </div>
            </div>
          </section>

          {/* SECURITY */}
          <section id="security" className="docs-section">
            <h2 className="docs-section-heading">Security</h2>
            <p>
              feeMON's architecture is designed to put security first, keeping users in control of their funds:
            </p>
            <ul>
              <li><strong>Self-Custody:</strong> Your funds are held securely in smart contracts on Monad. The protocol cannot access them without your signature.</li>
              <li><strong>No Private Keys stored:</strong> The app works entirely client-side. The backend database never receives your keys or seed phrases.</li>
              <li><strong>Wallet signing:</strong> Every deposit, withdrawal request, and withdrawal execution must be authorized and signed directly by your wallet client (MetaMask / Rabby).</li>
              <li><strong>Immutable contracts:</strong> All feeMON contracts are immutable once deployed to prevent updates or changes to their logic.</li>
              <li><strong>Validator Registry Transparency:</strong> Validator metrics, commitments, and historical events are stored on-chain and are open for anyone to inspect.</li>
            </ul>
          </section>

          {/* PROTOCOL LIFECYCLE */}
          <section id="lifecycle" className="docs-section">
            <h2 className="docs-section-heading">Protocol Lifecycle</h2>
            <p>
              Here is the complete journey of funds inside the feeMON protocol:
            </p>
            <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li><strong>Deposit:</strong> User stakes MON to the feeMON pool.</li>
              <li><strong>Minting:</strong> Staking contract mints fMON and sends it to the user.</li>
              <li><strong>Delegation:</strong> The protocol routes the MON to active validators registered in the Validator Registry.</li>
              <li><strong>Earning Fees:</strong> Validators perform PoS duties, earning block rewards and priority fees.</li>
              <li><strong>Fee-Sharing:</strong> Validators call <code>externalReward()</code> to transfer shared priority fees back to feeMON.</li>
              <li><strong>Value Compounding:</strong> Shared fees increase the pool's assets, raising the fMON exchange rate.</li>
              <li><strong>Withdrawal:</strong> User requests withdrawal. fMON is burned, and MON is undelegated.</li>
              <li><strong>Finalization:</strong> After 1 epoch, the user claims their increased amount of MON.</li>
            </ol>
          </section>

          {/* FAQ */}
          <section id="faq" className="docs-section" style={{ borderBottom: 'none' }}>
            <h2 className="docs-section-heading">FAQ</h2>
            
            <FAQItem question="What is fMON?">
              fMON is the Liquid Staking Token (LST) issued by the feeMON protocol. When you stake MON, you receive fMON. 
              As validators deposit shared priority fees into the feeMON contract, fMON increases in value relative to MON.
            </FAQItem>
            
            <FAQItem question="Why doesn't my wallet balance increase?">
              fMON is an appreciating token. Instead of sending new tokens to your wallet every day, the fMON/MON exchange rate 
              increases. The number of fMON in your wallet stays the same, but each fMON can be redeemed for more MON than before.
            </FAQItem>
            
            <FAQItem question="How is this different from normal staking?">
              Standard PoS staking only earns you network emissions (block rewards). feeMON forces validators to share 
              priority gas fees (tips) with you as well, resulting in a higher overall APY.
            </FAQItem>
            
            <FAQItem question="What happens if a validator stops sharing fees?">
              The feeMON protocol automatically monitors validator deposits. If a validator stops sharing fees or drops 
              below their committed pledge, the protocol redelegates MON to other validators.
            </FAQItem>
            
            <FAQItem question="Can I withdraw anytime?">
              Yes, you can request a withdrawal at any time. However, due to Monad's native PoS rules, there is an undelegation 
              wait of 1 epoch (~5.5 hours) before you can execute the final claim.
            </FAQItem>
            
            <FAQItem question="How is the exchange rate calculated?">
              The exchange rate is calculated on-chain by dividing the total MON managed by the contract (deposits + compounding fees) 
              by the total circulating supply of fMON.
            </FAQItem>
          </section>

        </main>
      </div>
    </>
  );
};

export default Docs;
