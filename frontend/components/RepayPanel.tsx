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
  useContractData, 
  useTokenBalance,
  useRepayFlow
} from "@/hooks/useContractInteraction";

interface RepayPanelProps {
  userAddress: string;
  currentDebt: number;
}

export default function RepayPanel({ userAddress, currentDebt }: RepayPanelProps) {
  const [amount, setAmount] = useState('');
  const [debt, setDebt] = useState(currentDebt);
  const { toast } = useToast();
  const account = useActiveAccount();
  const walletAddress = account?.address;

  // Get contract addresses
  const contractAddresses = getContractAddresses();
  const usdcTokenAddress = contractAddresses.USDC_TOKEN;
  const vaultAddress = contractAddresses.BITLEND_VAULT;
  
  // Get USDC balance
  const { balance, formattedBalance: usdcBalance } = useTokenBalance(usdcTokenAddress);
  
  // Get user's current debt
  const { data: positionData, isLoading: isPositionLoading } = useContractData(
    vaultAddress,
    "getPosition",
    [walletAddress || userAddress]
  );

  // Set up the repay flow
  const { executeRepay, isProcessing } = useRepayFlow(usdcTokenAddress, vaultAddress);

  useEffect(() => {
    if (positionData) {
      const [, debtAmount] = positionData;
      if (debtAmount) {
        setDebt(Number(formatUnits(debtAmount.toString(), 6))); // USDC has 6 decimals
      }
    }
  }, [positionData]);

  const handleRepay = async () => {
    if (!amount || Number(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to repay",
        variant: "destructive",
      });
      return;
    }

    if (Number(amount) > Number(usdcBalance)) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough USDC to repay this amount",
        variant: "destructive",
      });
      return;
    }

    // Prevent repaying more than the current debt
    const repayAmount = Math.min(Number(amount), debt);

    try {
      // Use our custom hook for the repay flow
      await executeRepay(repayAmount.toString());
      
      toast({
        title: "Repayment successful",
        description: `You have successfully repaid ${repayAmount} USDC.`,
      });

      // Clear the input
      setAmount('');
    } catch (error) {
      console.error("Repay error:", error);
      toast({
        title: "Repayment failed",
        description: "Failed to repay USDC. Please try again.",
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
              <Label htmlFor="repay-amount">Repay Amount (USDC)</Label>
              <span className="text-xs text-muted-foreground">
                Balance: {usdcBalance} USDC
              </span>
            </div>
            <Input
              id="repay-amount"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              step="0.01"
              min="0"
              max={Math.min(Number(usdcBalance), debt)}
              disabled={isProcessing}
            />
            
            <div className="flex justify-end space-x-2 mt-1">
              <button
                type="button"
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                onClick={() => setAmount(Math.min(Number(usdcBalance), debt).toString())}
              >
                Max
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Current Debt</Label>
            <p className="text-sm font-medium">{debt.toFixed(2)} USDC</p>
          </div>

          <div className="space-y-1">
            <Label>Remaining Debt After Repayment</Label>
            <p className="text-sm font-medium">
              {Math.max(0, debt - (amount ? Number(amount) : 0)).toFixed(2)} USDC
            </p>
          </div>

          <Button 
            className="w-full" 
            onClick={handleRepay}
            disabled={
              isProcessing || 
              !amount || 
              Number(amount) <= 0 || 
              Number(amount) > Number(usdcBalance) || 
              debt <= 0
            }
          >
            {isProcessing ? "Processing..." : "Repay USDC"}
          </Button>

          <div className="pt-2 text-xs text-muted-foreground">
            <p>• Repaying your debt will increase your health factor and reduce liquidation risk.</p>
            <p>• You can repay any amount up to your total debt at any time.</p>
            <p>• Repaying in full will stop interest accrual on your position.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 