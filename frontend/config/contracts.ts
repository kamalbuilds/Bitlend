export type ContractAddresses = {
  trustId: string;
  trustIdFactory: string;
  aiReputationOracle: string;
};

// Contract addresses for different networks
const contracts: Record<string, ContractAddresses> = {
  // RSK Testnet addresses
  testnet: {
    trustId: process.env.NEXT_PUBLIC_TRUST_ID_ADDRESS || "", // Replace with actual deployed address
    trustIdFactory: process.env.NEXT_PUBLIC_TRUST_ID_FACTORY_ADDRESS || "", // Replace with actual deployed address
    aiReputationOracle: process.env.NEXT_PUBLIC_AI_REPUTATION_ORACLE_ADDRESS || "", // Replace with actual deployed address
  },
  // RSK Mainnet addresses
  mainnet: {
    trustId: "0x0000000000000000000000000000000000000000", // Replace with actual deployed address
    trustIdFactory: "0x0000000000000000000000000000000000000000", // Replace with actual deployed address
    aiReputationOracle: "0x0000000000000000000000000000000000000000", // Replace with actual deployed address
  },
  // Local development
  localhost: {
    trustId: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    trustIdFactory: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    aiReputationOracle: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  },
};

export default contracts;

// Contract addresses for exSat Network
export const EXSAT_CHAIN_ID = 7200; // exSat Mainnet
export const EXSAT_TESTNET_CHAIN_ID = 7300; // exSat Testnet (using a placeholder value)

// Contract addresses - replace with actual deployed addresses
export const CONTRACT_ADDRESSES = {
  // MAINNET
  [EXSAT_CHAIN_ID]: {
    XBTC_TOKEN: "0x4aa4365da82ACD46e378A6f3c92a863f3e763d34", // Real XBTC token on exSat
    XSAT_TOKEN: "0x8266f2fbc720012e5Ac038aD3dbb29d2d613c459", // Real XSAT token on exSat
    USDC_TOKEN: "0x893AfC357b656EdD4F0c028670516F846FE89CFb", // Replace with actual USDC token on exSat
    BITLEND_VAULT: "", // To be filled after deployment
    BITLEND_PRICE_ORACLE: "", // To be filled after deployment
    BITLEND_PROOF_OF_RESERVES: "", // To be filled after deployment
    BITLEND_LIQUIDATOR: "", // To be filled after deployment
    BITLEND_BRIDGE: "", // To be filled after deployment
  },
  // TESTNET
  [EXSAT_TESTNET_CHAIN_ID]: {
    XBTC_TOKEN: "0x4aa4365da82ACD46e378A6f3c92a863f3e763d34", // Replace with testnet address
    XSAT_TOKEN: "0x8266f2fbc720012e5Ac038aD3dbb29d2d613c459", // Replace with testnet address
    USDC_TOKEN: "0x893AfC357b656EdD4F0c028670516F846FE89CFb", // Replace with testnet address
    BITLEND_VAULT: "", // To be filled after deployment
    BITLEND_PRICE_ORACLE: "", // To be filled after deployment
    BITLEND_PROOF_OF_RESERVES: "", // To be filled after deployment
    BITLEND_LIQUIDATOR: "", // To be filled after deployment
    BITLEND_BRIDGE: "", // To be filled after deployment
  }
};

// Chain configuration for ThirdWeb
export const EXSAT_CHAIN_CONFIG = {
  chainId: EXSAT_CHAIN_ID,
  name: "exSat Network",
  symbol: "BTC",
  rpcUrls: ["https://evm.exsat.network/"],
  blockExplorerUrls: ["https://scan.exsat.network/"],
  nativeCurrency: {
    name: "BTC",
    symbol: "BTC",
    decimals: 18,
  },
};

export const EXSAT_TESTNET_CHAIN_CONFIG = {
  chainId: EXSAT_TESTNET_CHAIN_ID,
  name: "exSat Testnet",
  symbol: "BTC",
  rpcUrls: ["https://evm-tst3.exsat.network/"],
  blockExplorerUrls: ["https://scan-testnet.exsat.network/"],
  nativeCurrency: {
    name: "BTC",
    symbol: "BTC",
    decimals: 18,
  },
};

// ABIs for our contracts
export const CONTRACT_ABIS = {
  // Import ABIs once contracts are compiled
  BITLEND_VAULT: [], // Will be filled with the ABI
  BITLEND_PRICE_ORACLE: [], // Will be filled with the ABI
  BITLEND_PROOF_OF_RESERVES: [], // Will be filled with the ABI
  BITLEND_LIQUIDATOR: [], // Will be filled with the ABI
  BITLEND_BRIDGE: [], // Will be filled with the ABI
};

// Default network to use
export const DEFAULT_NETWORK = process.env.NEXT_PUBLIC_DEFAULT_NETWORK === "mainnet" 
  ? EXSAT_CHAIN_ID 
  : EXSAT_TESTNET_CHAIN_ID;

// Helper function to get the correct contract addresses based on chain ID
export const getContractAddresses = (chainId: number = DEFAULT_NETWORK) => {
  return CONTRACT_ADDRESSES[chainId] || CONTRACT_ADDRESSES[EXSAT_TESTNET_CHAIN_ID];
}; 