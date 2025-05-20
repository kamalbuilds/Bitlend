import { useState } from 'react';
import { 
  useActiveAccount, 
  useReadContract,
  useSendTransaction
} from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { parseUnits, formatUnits } from "ethers";
import { getContractAddresses } from "@/config/contracts";
import { client } from "@/lib/client";

// Define exSat chain configuration here directly to avoid import issues
const chainConfig = {
  id: process.env.NEXT_PUBLIC_DEFAULT_NETWORK === "mainnet" ? 7200 : 839999,
  name: process.env.NEXT_PUBLIC_DEFAULT_NETWORK === "mainnet" ? "exSat Network" : "exSat Testnet",
  rpc: process.env.NEXT_PUBLIC_DEFAULT_NETWORK === "mainnet" 
    ? "https://evm.exsat.network/" 
    : "https://evm-tst3.exsat.network/",
};

/**
 * Custom hook to get a contract instance
 */
export const useContractInstance = (contractAddress: string) => {
  if (!contractAddress) {
    return { contract: null };
  }
  
  try {
    const contract = getContract({
      client,
      address: contractAddress,
      // Use the simplified chain config without blockExplorers
      chain: chainConfig,
    });
    return { contract };
  } catch (error) {
    console.error("Error creating contract instance:", error);
    return { contract: null };
  }
};

/**
 * Custom hook to read data from a contract
 */
export const useContractData = (
  contractAddress: string,
  functionName: string,
  args: any[] = []
) => {
  const { contract } = useContractInstance(contractAddress);
  
  // Only call if contract is available
  if (!contract) {
    return { data: undefined, isLoading: false, error: new Error("Contract not available") };
  }
  
  const result = useReadContract({
    contract,
    method: functionName,
    params: args,
  });
  
  return result;
};

/**
 * Custom hook to execute contract write operations
 */
export const useContractAction = (
  contractAddress: string,
  functionName: string
) => {
  const { contract } = useContractInstance(contractAddress);
  const { mutateAsync, isPending, isError, error } = useSendTransaction();
  
  const execute = async (args: any[] = []) => {
    try {
      if (!contract) throw new Error("Contract not initialized");
      
      const transaction = prepareContractCall({
        contract,
        method: functionName,
        params: args,
      });
      
      return await mutateAsync(transaction);
    } catch (err) {
      console.error(`Error executing ${functionName}:`, err);
      throw err;
    }
  };
  
  return { execute, isLoading: isPending, isError, error };
};

/**
 * Custom hook to get token balance
 */
export const useTokenBalance = (tokenAddress: string) => {
  const account = useActiveAccount();
  const address = account?.address;
  
  if (!address || !tokenAddress) {
    return { 
      balance: undefined, 
      formattedBalance: "0", 
      isLoading: false, 
      error: null 
    };
  }
  
  const { contract } = useContractInstance(tokenAddress);
  
  if (!contract) {
    return { 
      balance: undefined, 
      formattedBalance: "0", 
      isLoading: false, 
      error: new Error("Contract not available") 
    };
  }
  
  const { data, isLoading, error } = useReadContract({
    contract,
    method: "balanceOf",
    params: [address],
  });
  
  return { 
    balance: data, 
    formattedBalance: data ? formatUnits(data.toString(), 8) : "0", // Assuming 8 decimals, adjust as needed
    isLoading, 
    error 
  };
};

/**
 * Custom hook to approve and deposit tokens
 */
export const useDepositFlow = (tokenAddress: string, vaultAddress: string) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { execute: approveToken, isLoading: isApproving } = useContractAction(tokenAddress, "approve");
  const { execute: deposit, isLoading: isDepositing } = useContractAction(vaultAddress, "deposit");
  
  const executeDeposit = async (amount: string) => {
    try {
      setIsProcessing(true);
      const amountInWei = parseUnits(amount, 8); // Assuming 8 decimals, adjust as needed
      
      // First approve
      await approveToken([vaultAddress, amountInWei]);
      
      // Then deposit
      return await deposit([amountInWei]);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return { 
    executeDeposit, 
    isProcessing: isProcessing || isApproving || isDepositing 
  };
};

/**
 * Custom hook to borrow tokens
 */
export const useBorrowFlow = (vaultAddress: string) => {
  const { execute: borrow, isLoading } = useContractAction(vaultAddress, "borrow");
  
  const executeBorrow = async (amount: string) => {
    try {
      const amountInWei = parseUnits(amount, 6); // Assuming USDC with 6 decimals
      return await borrow([amountInWei]);
    } catch (err) {
      console.error("Borrow error:", err);
      throw err;
    }
  };
  
  return { executeBorrow, isLoading };
};

/**
 * Custom hook to repay a loan
 */
export const useRepayFlow = (tokenAddress: string, vaultAddress: string) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { execute: approveToken, isLoading: isApproving } = useContractAction(tokenAddress, "approve");
  const { execute: repay, isLoading: isRepaying } = useContractAction(vaultAddress, "repay");
  
  const executeRepay = async (amount: string) => {
    try {
      setIsProcessing(true);
      const amountInWei = parseUnits(amount, 6); // Assuming USDC with 6 decimals
      
      // First approve
      await approveToken([vaultAddress, amountInWei]);
      
      // Then repay
      return await repay([amountInWei]);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return { 
    executeRepay, 
    isProcessing: isProcessing || isApproving || isRepaying 
  };
};

/**
 * Custom hook to withdraw collateral
 */
export const useWithdrawFlow = (vaultAddress: string) => {
  const { execute: withdraw, isLoading } = useContractAction(vaultAddress, "withdraw");
  
  const executeWithdraw = async (amount: string) => {
    try {
      const amountInWei = parseUnits(amount, 8); // Assuming XBTC with 8 decimals
      return await withdraw([amountInWei]);
    } catch (err) {
      console.error("Withdraw error:", err);
      throw err;
    }
  };
  
  return { executeWithdraw, isLoading };
};

/**
 * Custom hook for bridge operations
 */
export const useBridgeFlow = (bridgeAddress: string, xbtcAddress: string) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { execute: register, isLoading: isRegistering } = useContractAction(bridgeAddress, "registerBtcAddress");
  const { execute: withdraw, isLoading: isWithdrawing } = useContractAction(bridgeAddress, "withdraw");
  const { execute: approve, isLoading: isApproving } = useContractAction(xbtcAddress, "approve");
  
  const registerBtcAddress = async (btcAddress: string) => {
    try {
      return await register([btcAddress]);
    } catch (err) {
      console.error("Registration error:", err);
      throw err;
    }
  };
  
  const withdrawToBtc = async (amount: string) => {
    try {
      setIsProcessing(true);
      const amountInWei = parseUnits(amount, 8); // XBTC has 8 decimals
      
      // First approve
      await approve([bridgeAddress, amountInWei]);
      
      // Then withdraw
      return await withdraw([amountInWei]);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return { 
    registerBtcAddress, 
    withdrawToBtc, 
    isRegistering, 
    isProcessing: isProcessing || isApproving || isWithdrawing 
  };
}; 