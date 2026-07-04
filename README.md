# feeMON: Liquid Staking Protocol with Fee-Sharing on Monad

**feeMON** is the first yield-optimized, fee-sharing liquid staking protocol built specifically for the Monad blockchain. By unlocking the value of locked stake and creating a competitive marketplace for validator priority fee redistribution, feeMON delivers a superior yield compared to traditional Proof-of-Stake (PoS) delegation.

---

## 📖 Table of Contents
1. [Introduction](#introduction)
2. [The Problem](#the-problem)
3. [The Solution](#the-solution)
4. [Architecture & Flow](#architecture--flow)
5. [Smart Contracts](#smart-contracts)
6. [Monad Integration](#monad-integration)
7. [Mathematics](#mathematics)
8. [AI Advisor (Claude Integration)](#ai-advisor-claude-integration)
9. [x402 Micropayments](#x402-micropayments)
10. [Security Model](#security-model)
11. [Protocol Lifecycle](#protocol-lifecycle)
12. [Getting Started](#getting-started)

---

## Introduction

Under native Proof-of-Stake systems, delegators lock up their native assets (e.g. MON) to secure the network, receiving block validation rewards in return. However, delegators lose liquidity, and they are completely excluded from a lucrative source of network revenue: **Priority Fees (gas tips)** paid by users seeking fast execution. 

feeMON changes this paradigm:
- **Liquid Staking:** Users deposit MON into the feeMON pool and receive **fMON**—a liquid, yield-bearing representation token that can be freely traded or used in DeFi.
- **Priority Fee Sharing:** feeMON leverages Monad's custom consensus mechanics to enable validators to share a portion of their priority fees back to the staking contract, appreciating the value of fMON.

---

## The Problem

Traditionally, validators receive block emission rewards and 100% of transaction priority fees. While the block emissions are split with delegators, the priority fees are sent directly to the validator's coinbase address on-chain. There is no native protocol mechanism to share these fees with delegators, leaving them with lower APY during periods of high network congestion.

```
┌─────────────────────────────────────────────────────────┐
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
└───────────────────────────┴─────────────────────────────┘
```

---

## The Solution

feeMON introduces a competitive, on-chain **Validator Registry**. Validators bid for delegator stake by pledging a percentage of their earned priority fees back to the feeMON pool. 
By depositing these priority fees back into the feeMON contract (using Monad's native hooks), the underlying MON backing of fMON increases, causing fMON to appreciate in value relative to MON.

```
┌──────────┐      ┌──────────┐      ┌─────────────┐      ┌───────────────┐
│   User   ├─────►│  feeMON  ├─────►│  Registry   ├─────►│ Best Validator│
└──────────┘      └────┬─────┘      └─────────────┘      └───────┬───────┘
                       │                                         │
                       │   Appreciates                           ▼
                       │   Exchange Rate                 ┌───────────────┐
                       │                                 │ Monad Staking │
                       │◄────────────────────────────────┼───────────────┤
                       │       externalReward() (Fees)   │   Precompile  │
                       └─────────────────────────────────┴───────────────┘
```

---

## Architecture & Flow

The system flows seamlessly from the client-side wallet through our smart contract layers directly into Monad's precompiled consensus engine:

```
[ Wallet UI ] ──► [ FeeMON Contract ] ──► [ Validator Registry ] ──► [ Staking Precompile (0x1000) ] ──► [ Validator Node ] ──► externalReward() Hook
```

---

## Smart Contracts

### 1. `FeeMON.sol`
The primary ERC-20 yield-bearing token contract. It manages deposits, tracks the total MON managed, coordinates with the precompiled staking address (`0x300` / `0x1000`), handles withdrawal queueing, and processes fee-sharing harvests.

- `deposit()`: Mints fMON at the current exchange rate and routes native MON to the best-performing registered validator.
- `requestWithdraw()`: Initiates the undelegation process. Due to Monad's consensus engine, withdrawals require a 1-epoch finalization delay (~5.5 hours).
- `withdraw()`: Transfers the unstaked MON back to the user after the epoch delay has elapsed.

```solidity
function deposit() external payable returns (uint256) {
    require(msg.value >= 0.1 ether, "Min stake is 0.1 MON");
    
    uint64 validatorId = _getBestValidator();

    (bool success, ) = address(STAKING).call{value: msg.value}(
        abi.encodeWithSignature("delegate(uint64)", validatorId)
    );
    require(success, "Delegation failed");

    uint256 shares = previewDeposit(msg.value);
    
    delegatedTo[validatorId] += msg.value;
    userStaking[msg.sender].validatorId = validatorId;
    userStaking[msg.sender].amount += msg.value;

    fMonToken.mint(msg.sender, shares);
    _totalMONManaged += msg.value;
    
    emit Delegated(msg.sender, validatorId, msg.value, shares);
    emit Deposited(msg.sender, msg.value, shares);
    return shares;
}
```

### 2. `ValidatorRegistry.sol`
Maintains the registration of active, fee-sharing validator nodes.

- `register()`: Pledges a validator's address, ID, and a minimum priority fee-sharing commitment in Basis Points (BPS).
- `update()`: Adjusts fee-sharing parameters. Fee increases apply instantly; decreases undergo a mandatory safety delay to protect delegators.

---

## Monad Integration

Monad includes native blockchain mechanics exposed to the EVM layer:
* **Staking Precompile (`0x0000000000000000000000000000000000001000`):** Acts as the consensus staking bridge. Any contract or account can interact with the precompile using Solidity's low-level call structure to delegate, undelegate, or claim rewards.
* **`externalReward()`:** A built-in function of the precompile that allows validator nodes to automatically compound transaction tips and execution fees into the feeMON contract.

---

## Mathematics

### 1. fMON Exchange Rate
The exchange rate ($ER$) dictates how much MON backing 1 fMON has.

$$ER = \frac{\text{Total MON Managed}}{\text{Total fMON Supply}}$$

As validators harvest and deposit priority fees, $\text{Total MON Managed}$ increases while $\text{Total fMON Supply}$ remains constant, causing fMON to appreciate.

### 2. User Balance Valuation
The value of a user's staked position in MON is calculated as:

$$\text{User Value (MON)} = \text{fMON Balance} \times ER$$

### 3. Total Value Locked (TVL)
The sum of all base user deposits plus compounding shared validator fees:

$$\text{TVL} = \text{Deposited MON} + \text{Compounded Priority Fees}$$

### 4. Validator Score Calculation
feeMON dynamically scores and delegates incoming MON to the best-performing validators based on a weighted criteria:

$$\text{Score} = 0.5 \times \text{Fee Share Commitment} + 0.3 \times \text{Uptime} + 0.2 \times \text{Reward Consistency}$$

---

## AI Advisor (Claude Integration)

feeMON integrates a Claude-powered AI analytics engine to assist users in evaluating protocol performance.
- The AI **never** controls funds, stores private keys, or signs transactions.
- It analyzes on-chain validator behavior, uptime metrics, and reward histories to generate objective, data-backed yield advice.

---

## x402 Micropayments

The backend API uses the **x402 protocol** for premium AI requests.
- Premium validator reports and optimization advice cost exactly **0.001 MON** per query.
- Payments are handled directly via Web3 wallet signatures, transferring micro-payments directly to the service provider.

---

## Security Model

- **Self-Custody:** User funds are secured directly in smart contracts on Monad; no custody is held by the operators.
- **No Stored Private Keys:** The backend and frontend handle keys purely client-side via wallet extensions (MetaMask, Rabby).
- **Epoch Locks:** Withdrawal requests are locked for 1 epoch to match Monad's native unstaking finality rules.
- **Immutability:** Contracts are deployed without update hooks to secure logic rules against arbitrary modifications.

---

## Protocol Lifecycle

1. **Deposit:** User stakes MON to the feeMON pool.
2. **Minting:** The protocol mints fMON shares to the user's wallet.
3. **Delegation:** The protocol automatically delegates the MON to high-scoring validators.
4. **Validation:** Validators run nodes, secure Monad, and collect gas priority fees.
5. **Fee Sharing:** Validators trigger `externalReward()`, returning a portion of their gas tips back to the feeMON contract.
6. **Compounding:** The contract's MON pool grows, raising the fMON exchange rate.
7. **Withdrawal Request:** The user triggers a request to withdraw, burning fMON.
8. **Final Claim:** After 1 epoch, the user claims their original MON plus all compounding rewards.

---

## Getting Started

### 📋 Prerequisites
- Node.js (v18+)
- Hardhat
- A Web3 browser wallet (MetaMask, Rabby, etc.) configured for Monad Testnet.

### ⚙️ Setup and Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kaverimeshram/FeeMon-.git
   cd FeeMon-
   ```

2. **Install root dependencies (Frontend and Contracts):**
   ```bash
   npm install
   ```

3. **Install Backend dependencies:**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Environment Variables:**
   - Copy `.env.example` to `.env` in the root directory and add your private keys:
     ```bash
     cp .env.example .env
     ```
   - Copy `backend/.env.example` to `backend/.env` and add details:
     ```bash
     cp backend/.env.example backend/.env
     ```

### 🚀 Running the Application

- **Start the Frontend development server:**
  ```bash
  npm run dev
  ```
- **Start the Backend API:**
  ```bash
  cd backend
  npm run dev
  ```

---

*Built with ❤️ for the Monad Ecosystem.*
