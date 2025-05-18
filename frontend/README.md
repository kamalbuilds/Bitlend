# RSK TrustID Frontend

A Next.js frontend for the RSK TrustID self-sovereign identity and reputation system.

## Features

- Create and manage self-sovereign digital identities on Rootstock blockchain
- Issue, verify, and manage verifiable credentials
- View AI-powered reputation scores
- Connect with thirdweb wallet integration
- Enhanced UX with account abstraction (Smart Wallets)

## Getting Started

### Prerequisites

- Node.js 14+ and npm/yarn
- Access to an RSK testnet or mainnet node
- MetaMask or another web3 wallet with Rootstock network configured

### Installation

1. Clone the repository and navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Copy the example environment file and update with your values:
   ```
   cp .env.example .env.local
   ```

   You'll need to provide:
   - ThirdWeb API keys (get from https://thirdweb.com/dashboard)
   - Contract addresses for your deployed TrustID smart contracts

4. Start the development server:
   ```
   npm run dev
   ```

### Wallet Configuration

This project uses thirdweb for wallet integration. Key features include:

1. **Multiple wallet types support**: Connect with MetaMask, Coinbase Wallet, WalletConnect, and more
2. **Cross-chain support**: Works with Rootstock mainnet and testnet
3. **Enhanced UX features**: Human-readable errors, simplified transaction flows

### Smart Contract Integration

Our dApp interacts with the following RSK smart contracts:

- **TrustIDFactory**: Creates and manages decentralized identities
- **TrustID**: Core identity and credential management
- **AIReputationOracle**: AI-powered reputation scoring system

## Development

The project structure follows Next.js app router conventions:

- `app/`: Page components and routing
- `components/`: Reusable UI components
- `lib/`: Utility functions and contract interaction
- `config/`: Configuration settings

### TrustID Contract Interactions

The `lib/thirdweb-contracts.ts` file contains hooks for interacting with the TrustID contracts using thirdweb:

```typescript
// Example: Creating a new identity
const { mutateAsync: createIdentity, isLoading } = useCreateIdentity();

// Call the function
await createIdentity({ args: [username, metadataURI] });
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
