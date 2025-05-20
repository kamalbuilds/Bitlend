"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useActiveAccount } from "thirdweb/react";
import { getContractAddresses } from "@/config/contracts";
import { parseUnits, formatUnits } from "ethers";
import { 
  useContractData, 
  useBorrowFlow 
} from "@/hooks/useContractInteraction";

interface BorrowPanelProps {
  userAddress: string;
  maxBorrow: number;
}

export default function BorrowPanel({ userAddress, maxBorrow }: BorrowPanelProps) {
  const [amount, setAmount] = useState('');
  const [ltv, setLtv] = useState(50); // Loan-to-Value percentage
  const [maxBorrowAmount, setMaxBorrowAmount] = useState(maxBorrow);
  const [healthFactor, setHealthFactor] = useState(200); // Initial health factor
  const { toast } = useToast();
  const account = useActiveAccount();
  const walletAddress = account?.address;

  // Get contract addresses
  const contractAddresses = getContractAddresses();
  const vaultAddress = contractAddresses.BITLEND_VAULT;
  
  // Get user's position data
  const { data: positionData, isLoading: isPositionLoading } = useContractData(
    vaultAddress,
    "getPosition",
    [walletAddress || userAddress]
  );
  
  // Set up the borrow function
  const { executeBorrow, isLoading: isBorrowing } = useBorrowFlow(vaultAddress);

  // Calculate max borrow amount based on collateral value and health factor
  useEffect(() => {
    if (positionData) {
      const [collateralAmount, debtAmount, currentHealthFactor] = positionData;
      
      // Save the current health factor
      setHealthFactor(Number(formatUnits(currentHealthFactor.toString(), 2))); // Convert from percentage with 2 decimals
      
      // Calculate max borrow amount based on collateral
      if (collateralAmount) {
        // This is a simplified calculation - in a real app, you'd query the price oracle
        // for exact conversion rates between XBTC and stablecoins
        const collateralValueUSD = Number(formatUnits(collateralAmount.toString(), 8)) * 70000; // Assuming 1 BTC = $70,000
        const maxLoanToValue = 0.7; // 70% maximum LTV
        
        // Max borrowable is collateral value * max LTV, minus existing debt
        const existingDebt = Number(formatUnits(debtAmount.toString(), 6)); // USDC has 6 decimals
        const calculatedMaxBorrow = (collateralValueUSD * maxLoanToValue) - existingDebt;
        
        setMaxBorrowAmount(Math.max(0, calculatedMaxBorrow));
      }
    }
  }, [positionData]);

  // Update amount based on LTV slider
  useEffect(() => {
    if (maxBorrowAmount > 0) {
      // Calculate amount based on chosen LTV percentage
      const newAmount = (maxBorrowAmount * (ltv / 100)).toFixed(2);
      setAmount(newAmount);
    }
  }, [ltv, maxBorrowAmount]);

  // Update health factor preview based on selected amount
  useEffect(() => {
    if (positionData && amount) {
      const [collateralAmount, currentDebtAmount, currentHealthFactor] = positionData;
      
      // This is a simplified calculation - in a real app, this would use the actual formulas from the contract
      if (collateralAmount && currentDebtAmount) {
        const collateralValue = Number(formatUnits(collateralAmount.toString(), 8)) * 70000; // Assuming 1 BTC = $70,000
        const existingDebt = Number(formatUnits(currentDebtAmount.toString(), 6));
        const newDebt = existingDebt + Number(amount);
        
        if (newDebt > 0) {
          // Health factor formula: (collateral value * liquidation threshold) / debt value
          const liquidationThreshold = 1.4; // 140%
          const newHealthFactor = (collateralValue * liquidationThreshold) / newDebt;
          setHealthFactor(Math.min(200, Math.round(newHealthFactor * 100))); // Cap at 200% for UI
        }
      }
    }
  }, [amount, positionData]);

  const handleBorrow = async () => {
    if (!amount || Number(amount) <= 0 || Number(amount) > maxBorrowAmount) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to borrow",
        variant: "destructive",
      });
      return;
    }

    if (healthFactor < 140) {
      toast({
        title: "Health factor too low",
        description: "Borrowing this amount would put your position at risk of liquidation",
        variant: "destructive",
      });
      return;
    }

    try {
      // Execute borrow transaction using our custom hook
      await executeBorrow(amount);
      
      toast({
        title: "Borrow successful",
        description: `You have successfully borrowed ${amount} USDC.`,
      });

      // Clear the input
      setAmount('');
      setLtv(50);
    } catch (error) {
      console.error("Borrow error:", error);
      toast({
        title: "Borrow failed",
        description: "Failed to borrow USDC. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Helper to get health factor color
  const getHealthFactorColor = () => {
    if (healthFactor >= 175) return "text-green-500";
    if (healthFactor >= 150) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="borrow-amount">Borrow Amount (USDC)</Label>
              <span className="text-xs text-muted-foreground">
                Max: ${maxBorrowAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
            <Input
              id="borrow-amount"
              placeholder="0.0"
              value={amount}
              onChange={(e) => {
                const value = e.target.value;
                setAmount(value);
                
                // Update LTV slider based on entered amount
                if (Number(value) > 0 && maxBorrowAmount > 0) {
                  const newLtv = Math.min(100, Math.round((Number(value) / maxBorrowAmount) * 100));
                  setLtv(newLtv);
                }
              }}
              type="number"
              step="0.01"
              min="0"
              max={maxBorrowAmount}
              disabled={isBorrowing}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Loan-to-Value</Label>
              <span className="text-xs font-medium">{ltv}%</span>
            </div>
            <Slider
              value={[ltv]}
              onValueChange={(values) => setLtv(values[0])}
              min={0}
              max={100}
              step={1}
              disabled={isBorrowing}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Safer</span>
              <span>Riskier</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <Label>Health Factor</Label>
              <span className={`text-sm font-medium ${getHealthFactorColor()}`}>
                {healthFactor}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full ${healthFactor >= 175 ? 'bg-green-500' : healthFactor >= 150 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                style={{ width: `${Math.min(healthFactor / 2, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Liquidation at below 140%. Maintain above 150% to be safe.
            </p>
          </div>

          <Button 
            className="w-full" 
            onClick={handleBorrow}
            disabled={
              isBorrowing || 
              !amount || 
              Number(amount) <= 0 || 
              Number(amount) > maxBorrowAmount || 
              healthFactor < 140
            }
          >
            {isBorrowing ? "Processing..." : "Borrow USDC"}
          </Button>

          <div className="pt-2 text-xs text-muted-foreground">
            <p>• You are borrowing against your XBTC collateral.</p>
            <p>• Keep your health factor above 150% to avoid risk of liquidation.</p>
            <p>• Interest accrues over time on your borrowed amount.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 