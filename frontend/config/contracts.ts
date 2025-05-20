// Import addresses from the address.ts file
import {
  EXSAT_UTXO_MANAGEMENT_ADDRESS,
  EXSAT_BRIDGE_ADDRESS,
  XBTC_TOKEN_ADDRESS,
  USDC_TOKEN_ADDRESS,
  FEE_COLLECTOR_ADDRESS,
  BITLEND_PRICE_ORACLE_ADDRESS,
  BITLEND_PROOF_OF_RESOURCES_ADDRESS,
  BITLEND_VAULT_ADDRESS,
  BITLEND_BRIDGE_ADDRESS,
} from "@/lib/adress";

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
export const EXSAT_TESTNET_CHAIN_ID = 839999; // exSat Testnet 

// BitLend Protocol Contract Addresses (Real Deployed Addresses)
export const BITLEND_CONTRACTS = {
  // exSat contracts that BitLend integrates with
  EXSAT_UTXO_MANAGEMENT: EXSAT_UTXO_MANAGEMENT_ADDRESS,
  EXSAT_BRIDGE: EXSAT_BRIDGE_ADDRESS,
  
  // Token contracts
  XBTC_TOKEN: XBTC_TOKEN_ADDRESS,
  USDC_TOKEN: USDC_TOKEN_ADDRESS,
  
  // BitLend Protocol contracts
  BITLEND_VAULT: BITLEND_VAULT_ADDRESS,
  BITLEND_PRICE_ORACLE: BITLEND_PRICE_ORACLE_ADDRESS,
  BITLEND_PROOF_OF_RESERVES: BITLEND_PROOF_OF_RESOURCES_ADDRESS,
  BITLEND_BRIDGE: BITLEND_BRIDGE_ADDRESS,
  
  // Fee collector
  FEE_COLLECTOR: FEE_COLLECTOR_ADDRESS,
};

// Type for contract addresses
export type BitLendContractAddresses = typeof BITLEND_CONTRACTS;

// Contract addresses - using real deployed addresses
export const CONTRACT_ADDRESSES: Record<number, BitLendContractAddresses> = {
  // MAINNET
  [EXSAT_CHAIN_ID]: {
    ...BITLEND_CONTRACTS,
    // Additional mainnet specific addresses can be added here
  },
  // TESTNET - Using same addresses for now, update if testnet has different addresses
  [EXSAT_TESTNET_CHAIN_ID]: {
    ...BITLEND_CONTRACTS,
    // Update these if testnet has different contract addresses
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