"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useActiveAccount } from "thirdweb/react";
import { getContractAddresses } from "@/config/contracts";
import { parseUnits, formatUnits } from "ethers";
import { 
  useContractInstance, 
  useContractData, 
  useContractAction,
  useDepositFlow
} from "@/hooks/useContractInteraction";

interface DepositPanelProps {
  userAddress: string;
}

export default function DepositPanel({ userAddress }: DepositPanelProps) {
  const [amount, setAmount] = useState('');
  const [xbtcBalance, setXbtcBalance] = useState('0');
  const [currentCollateral, setCurrentCollateral] = useState('0');
  const { toast } = useToast();
  const account = useActiveAccount();
  const walletAddress = account?.address;

  // Get contract addresses
  const contractAddresses = getContractAddresses();
  const xbtcTokenAddress = contractAddresses.XBTC_TOKEN;
  const vaultAddress = contractAddresses.BITLEND_VAULT;
  
  // Use our custom hooks
  const { contract: xbtcContract } = useContractInstance(xbtcTokenAddress);
  const { contract: vaultContract } = useContractInstance(vaultAddress);
  
  // Get the balance data
  const { data: balance, isLoading: isBalanceLoading } = useContractData(
    xbtcTokenAddress,
    "balanceOf",
    walletAddress ? [walletAddress] : []
  );

  // Get user's current collateral balance
  const { data: userCollateral, isLoading: isCollateralLoading } = useContractData(
    vaultAddress,
    "getCollateralBalance",
    walletAddress ? [walletAddress] : userAddress ? [userAddress] : []
  );

  // Set up deposit flow
  const { executeDeposit, isProcessing } = useDepositFlow(xbtcTokenAddress, vaultAddress);

  useEffect(() => {
    if (balance) {
      setXbtcBalance(formatUnits(balance.toString(), 8)); // XBTC has 8 decimals
    }
  }, [balance]);

  useEffect(() => {
    if (userCollateral) {
      setCurrentCollateral(formatUnits(userCollateral.toString(), 8)); // XBTC has 8 decimals
    }
  }, [userCollateral]);

  const handleDeposit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to deposit",
        variant: "destructive",
      });
      return;
    }

    try {
      await executeDeposit(amount);
      
      toast({
        title: "Deposit successful",
        description: `You have successfully deposited ${amount} XBTC as collateral.`,
      });

      // Clear the input
      setAmount('');
    } catch (error) {
      console.error("Deposit error:", error);
      toast({
        title: "Deposit failed",
        description: "Failed to deposit XBTC. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="deposit-amount">Deposit Amount (XBTC)</Label>
              <span className="text-xs text-muted-foreground">
                Balance: {xbtcBalance} XBTC
              </span>
            </div>
            <Input
              id="deposit-amount"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              step="0.00000001"
              min="0"
              disabled={isProcessing}
            />
            
            <div className="flex justify-end mt-1">
              <button
                type="button"
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                onClick={() => setAmount(xbtcBalance)}
              >
                Max
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Current Collateral</Label>
            <p className="text-sm font-medium">{currentCollateral} XBTC</p>
          </div>

          <div className="space-y-1">
            <Label>New Total Collateral</Label>
            <p className="text-sm font-medium">
              {(Number(currentCollateral) + (amount ? Number(amount) : 0)).toFixed(8)} XBTC
            </p>
          </div>

          <Button 
            className="w-full" 
            onClick={handleDeposit}
            disabled={isProcessing || !amount || Number(amount) <= 0 || Number(amount) > Number(xbtcBalance)}
          >
            {isProcessing ? "Processing..." : "Deposit XBTC as Collateral"}
          </Button>

          <div className="pt-2 text-xs text-muted-foreground">
            <p>• Depositing XBTC allows you to borrow stablecoins against your collateral.</p>
            <p>• You can withdraw anytime as long as you maintain the required health factor.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 