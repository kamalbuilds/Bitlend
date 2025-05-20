// Contract utility functions for BitLend Protocol
import { BITLEND_CONTRACTS, getContractAddresses } from "@/config/contracts";
import { client } from "@/lib/client";
import { getContract } from "thirdweb";
import { defineChain } from "thirdweb";

// Define exSat testnet chain
export const exSatTestnet = defineChain({
  id: 839999,
  name: "exSat Testnet",
  rpc: "https://evm-tst3.exsat.network/",
  nativeCurrency: {
    name: "BTC",
    symbol: "BTC",
    decimals: 18,
  },
});

// Define exSat mainnet chain
export const exSatMainnet = defineChain({
  id: 7200,
  name: "exSat Network",
  rpc: "https://evm.exsat.network/",
  nativeCurrency: {
    name: "BTC",
    symbol: "BTC",
    decimals: 18,
  },
});

// Get contract instances
export const getBitLendVaultContract = (chainId: number = 839999) => {
  const addresses = getContractAddresses(chainId);
  const chain = chainId === 7200 ? exSatMainnet : exSatTestnet;
  
  return getContract({
    client,
    address: addresses.BITLEND_VAULT,
    chain,
  });
};

export const getXBTCTokenContract = (chainId: number = 839999) => {
  const addresses = getContractAddresses(chainId);
  const chain = chainId === 7200 ? exSatMainnet : exSatTestnet;
  
  return getContract({
    client,
    address: addresses.XBTC_TOKEN,
    chain,
  });
};

export const getUSDCTokenContract = (chainId: number = 839999) => {
  const addresses = getContractAddresses(chainId);
  const chain = chainId === 7200 ? exSatMainnet : exSatTestnet;
  
  return getContract({
    client,
    address: addresses.USDC_TOKEN,
    chain,
  });
};

export const getBitLendBridgeContract = (chainId: number = 839999) => {
  const addresses = getContractAddresses(chainId);
  const chain = chainId === 7200 ? exSatMainnet : exSatTestnet;
  
  return getContract({
    client,
    address: addresses.BITLEND_BRIDGE,
    chain,
  });
};

export const getBitLendProofOfReservesContract = (chainId: number = 839999) => {
  const addresses = getContractAddresses(chainId);
  const chain = chainId === 7200 ? exSatMainnet : exSatTestnet;
  
  return getContract({
    client,
    address: addresses.BITLEND_PROOF_OF_RESERVES,
    chain,
  });
};

// Utility function to get all contracts for a given chain
export const getAllBitLendContracts = (chainId: number = 839999) => {
  return {
    vault: getBitLendVaultContract(chainId),
    xbtc: getXBTCTokenContract(chainId),
    usdc: getUSDCTokenContract(chainId),
    bridge: getBitLendBridgeContract(chainId),
    proofOfReserves: getBitLendProofOfReservesContract(chainId),
  };
};

// Helper function to format addresses for display
export const formatAddress = (address: string, startChars: number = 6, endChars: number = 4) => {
  if (!address) return "";
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

// Contract addresses for easy access
export const CONTRACT_ADDRESSES = BITLEND_CONTRACTS; 