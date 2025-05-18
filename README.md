# BitLend: Trustless BTC Lending Protocol on exSat

![BitLend Logo](./frontend/public/images/logo.png)

## Project Overview

BitLend is a permissionless lending protocol built on exSat Network that allows Bitcoin holders to collateralize their BTC to borrow stablecoins or XSAT tokens. The platform leverages exSat's UTXO data synchronization and EVM compatibility to create a seamless, trustless lending experience with transparent proof of reserves.

## 🏆 Hackathon Submission

This project is a submission for the Bitcoin Hackathon 2025, targeting the following challenge tracks:

- **Best use of exSat** - $10,000 in Bitcoin prize
- **Best use of Rebar Data** - $7,000 in Bitcoin prize

## 🔑 Key Features

- **Bridge BTC to XBTC**: Seamlessly move assets between Bitcoin and exSat Network
- **Collateralized Lending**: Use your XBTC as collateral to borrow stablecoins
- **UTXO-Based Proof of Reserves**: Verify collateral directly using Bitcoin's UTXO data
- **Liquidation Protection**: MEV-protected liquidations using Rebar Shield
- **Market Analytics**: Real-time Bitcoin analytics powered by Rebar Data

## 🔧 Technical Innovations

### UTXO-Based Proof of Reserves

BitLend implements a transparent proof of reserves system using exSat's on-chain UTXO data. This allows users to:

- Verify their BTC collateral is backed 1:1 with actual Bitcoin
- Track UTXO confirmations for enhanced security
- Prove solvency of the lending platform at any time

Our system connects directly to exSat's UTXO Management Contract to access real-time Bitcoin data for verification.

### Rebar Data Integration

We leverage Rebar Data for enhanced market insights and security:

- **MEV Protection**: Submit liquidation transactions through Rebar Shield's private mempool
- **Market Analytics**: Display real-time Bitcoin network statistics
- **Liquidation Risk Monitoring**: Alert users when their positions are at risk of liquidation
- **Mempool Analysis**: Optimize transaction fees based on current network conditions

## 📋 Components

### Smart Contracts

- **BitLendBridge.sol**: Integrates with exSat's bridge for BTC to XBTC conversion
- **BitLendVault.sol**: Manages loan positions, collateral, and borrowing
- **BitLendPriceOracle.sol**: Provides price feeds with Rebar Data integration
- **BitLendLiquidator.sol**: Handles liquidations with MEV protection via Rebar Shield
- **BitLendProofOfReserves.sol**: Verifies collateral using exSat's UTXO data

### Frontend

- **Dashboard**: Displays positions, health factors, and available actions
- **BridgeModal**: Interface for BTC to XBTC conversion with UTXO verification
- **LoanManagement**: Components for deposit, borrow, repay, and withdraw actions
- **RebarAnalytics**: Shows market data and liquidation risks from Rebar
- **ProofOfReserves**: Visual verification of collateral using UTXO data

## 🚀 Getting Started

### Prerequisites

- Node.js v16 or higher
- An Ethereum wallet (MetaMask, etc.) connected to exSat Network
- Bitcoin to use as collateral

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/bitlend.git
   cd bitlend
   ```

2. Install dependencies:
   ```bash
   # Install contract dependencies
   cd contracts
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. Deploy the contracts to exSat Network:
   ```bash
   cd contracts
   npx hardhat run scripts/deploy.js --network exsatTestnet
   ```

4. Start the frontend:
   ```bash
   cd ../frontend
   npm run dev
   ```

5. Visit `http://localhost:3000` to access the BitLend app.

## 📊 How It Works

### Depositing Collateral

1. Connect your wallet and access the BitLend dashboard
2. Bridge your BTC to XBTC using the integrated bridge
3. Deposit your XBTC as collateral
4. Your collateral is verified using exSat's UTXO data

### Borrowing

1. With collateral deposited, check your available borrowing limit
2. Borrow stablecoins at competitive interest rates
3. Monitor your health factor to avoid liquidation

### Repaying and Withdrawing

1. Repay your loan partially or fully at any time
2. Once your loan is fully repaid, withdraw your collateral
3. Convert your XBTC back to BTC if desired

### Liquidation Protection

If your position becomes under-collateralized:

1. The BitLendLiquidator monitors position health
2. Liquidations are processed through Rebar Shield to prevent front-running
3. A liquidation history is maintained for transparency

## 🛠️ Technology Stack

- **Smart Contracts**: Solidity on exSat Network (EVM compatible)
- **Development Framework**: Hardhat
- **Frontend**: Next.js and React
- **Styling**: Tailwind CSS
- **Blockchain Interaction**: ethers.js
- **UTXO Data**: exSat UTXO Management Contract
- **Market Data**: Rebar Data API
- **MEV Protection**: Rebar Shield

## 🔮 Future Roadmap

- **Multi-asset Collateral**: Support for additional assets beyond BTC
- **Fixed-rate Loans**: Stable borrowing rates for predictable payments
- **Governance**: Community-owned protocol governance
- **Lightning Network Integration**: Fast cross-chain transaction capabilities
- **Yield Strategies**: Automated yield optimization for deposited collateral

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Contributors

- [Contributor 1](https://github.com/contributor1)
- [Contributor 2](https://github.com/contributor2)
- [Contributor 3](https://github.com/contributor3)

## 🙏 Acknowledgements

- [exSat Network](https://exsat.network) - For providing the Bitcoin-EVM infrastructure
- [Rebar Data](https://rebarlabs.io) - For Bitcoin analytics and MEV protection
- [OpenZeppelin](https://openzeppelin.com) - For secure smart contract libraries 