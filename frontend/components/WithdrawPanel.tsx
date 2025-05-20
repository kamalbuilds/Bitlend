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
  useWithdrawFlow
} from "@/hooks/useContractInteraction";

interface WithdrawPanelProps {
  userAddress: string;
  currentCollateral: number;
  currentDebt: number;
}

export default function WithdrawPanel({ 
  userAddress, 
  currentCollateral, 
  currentDebt 
}: WithdrawPanelProps) {
  const [amount, setAmount] = useState('');
  const [collateral, setCollateral] = useState(currentCollateral);
  const [debt, setDebt] = useState(currentDebt);
  const [maxWithdrawable, setMaxWithdrawable] = useState(0);
  const [healthFactor, setHealthFactor] = useState(200);
  const [newHealthFactor, setNewHealthFactor] = useState(200);
  const { toast } = useToast();
  const account = useActiveAccount();
  const walletAddress = account?.address;

  // Get contract addresses
  const contractAddresses = getContractAddresses();
  const vaultAddress = contractAddresses.BITLEND_VAULT;
  const priceOracleAddress = contractAddresses.BITLEND_PRICE_ORACLE;
  
  // Get user's position data
  const { data: positionData, isLoading: isPositionLoading } = useContractData(
    vaultAddress,
    "getPosition",
    [walletAddress || userAddress]
  );
  
  // Get XBTC price
  const { data: btcPrice, isLoading: isPriceLoading } = useContractData(
    priceOracleAddress,
    "getBtcPrice",
    []
  );
  
  // Set up the withdraw function
  const { executeWithdraw, isLoading: isWithdrawing } = useWithdrawFlow(vaultAddress);

  // Update collateral, debt and health factor when position data changes
  useEffect(() => {
    if (positionData) {
      const [collateralAmount, debtAmount, currentHealthFactor] = positionData;
      
      if (collateralAmount) {
        setCollateral(Number(formatUnits(collateralAmount.toString(), 8))); // XBTC has 8 decimals
      }
      
      if (debtAmount) {
        setDebt(Number(formatUnits(debtAmount.toString(), 6))); // USDC has 6 decimals
      }
      
      if (currentHealthFactor) {
        setHealthFactor(Number(formatUnits(currentHealthFactor.toString(), 2))); // Convert from percentage with 2 decimals
      }
    }
  }, [positionData]);

  // Calculate max withdrawable amount when data changes
  useEffect(() => {
    // Only calculate if we have debt and BTC price
    if (debt > 0 && btcPrice) {
      const btcPriceInUSD = Number(formatUnits(btcPrice.toString(), 8)); // Price oracle uses 8 decimals
      
      // Calculate the minimum required collateral to maintain a 150% health factor
      const minRequiredCollateralUSD = debt * 1.5; // 150% of the debt
      const minRequiredCollateralBTC = minRequiredCollateralUSD / btcPriceInUSD;
      
      // Max withdrawable is total collateral minus minimum required
      const calculatedMaxWithdrawable = Math.max(0, collateral - minRequiredCollateralBTC);
      
      setMaxWithdrawable(calculatedMaxWithdrawable);
    } else if (debt === 0) {
      // If there's no debt, all collateral can be withdrawn
      setMaxWithdrawable(collateral);
    }
  }, [collateral, debt, btcPrice]);

  // Calculate new health factor when amount changes
  useEffect(() => {
    if (debt > 0 && btcPrice && amount) {
      const withdrawAmount = Number(amount);
      
      if (withdrawAmount > 0) {
        const btcPriceInUSD = Number(formatUnits(btcPrice.toString(), 8)); // Price oracle uses 8 decimals
        
        // Calculate new collateral value
        const newCollateralAmount = collateral - withdrawAmount;
        const newCollateralUSD = newCollateralAmount * btcPriceInUSD;
        
        // Calculate new health factor
        const newHealthFactorValue = (newCollateralUSD / debt) * 100;
        setNewHealthFactor(Math.min(200, Math.round(newHealthFactorValue)));
      } else {
        setNewHealthFactor(healthFactor);
      }
    } else if (debt === 0) {
      // If there's no debt, health factor is infinite (show as 200% for UI)
      setNewHealthFactor(200);
    }
  }, [amount, collateral, debt, btcPrice, healthFactor]);

  const handleWithdraw = async () => {
    if (!amount || Number(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to withdraw",
        variant: "destructive",
      });
      return;
    }

    if (Number(amount) > collateral) {
      toast({
        title: "Insufficient collateral",
        description: "You don't have enough collateral to withdraw this amount",
        variant: "destructive",
      });
      return;
    }

    if (Number(amount) > maxWithdrawable) {
      toast({
        title: "Withdrawal limit exceeded",
        description: "This withdrawal would put your position at risk of liquidation",
        variant: "destructive",
      });
      return;
    }

    try {
      // Execute withdraw transaction using our custom hook
      await executeWithdraw(amount);
      
      toast({
        title: "Withdrawal successful",
        description: `You have successfully withdrawn ${amount} XBTC.`,
      });

      // Clear the input
      setAmount('');
    } catch (error) {
      console.error("Withdraw error:", error);
      toast({
        title: "Withdrawal failed",
        description: "Failed to withdraw XBTC. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Helper to get health factor color
  const getHealthFactorColor = (factor: number) => {
    if (factor >= 175) return "text-green-500";
    if (factor >= 150) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="withdraw-amount">Withdraw Amount (XBTC)</Label>
              <span className="text-xs text-muted-foreground">
                Available: {collateral.toFixed(8)} XBTC
              </span>
            </div>
            <Input
              id="withdraw-amount"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              step="0.00000001"
              min="0"
              max={Math.min(collateral, maxWithdrawable)}
              disabled={isWithdrawing}
            />
            
            <div className="flex justify-end space-x-2 mt-1">
              <button
                type="button"
                className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                onClick={() => setAmount(maxWithdrawable.toFixed(8))}
              >
                Max Safe
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Current Collateral</Label>
            <p className="text-sm font-medium">{collateral.toFixed(8)} XBTC</p>
          </div>

          <div className="space-y-1">
            <Label>Current Debt</Label>
            <p className="text-sm font-medium">{debt.toFixed(2)} USDC</p>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <Label>Current Health Factor</Label>
              <span className={`text-sm font-medium ${getHealthFactorColor(healthFactor)}`}>
                {healthFactor}%
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <Label>New Health Factor After Withdrawal</Label>
              <span className={`text-sm font-medium ${getHealthFactorColor(newHealthFactor)}`}>
                {newHealthFactor}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  newHealthFactor >= 175 ? 'bg-green-500' : 
                  newHealthFactor >= 150 ? 'bg-yellow-500' : 
                  'bg-red-500'
                }`} 
                style={{ width: `${Math.min(newHealthFactor / 2, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Liquidation at below 140%. Maintain above 150% to be safe.
            </p>
          </div>

          <Button 
            className="w-full" 
            onClick={handleWithdraw}
            disabled={
              isWithdrawing || 
              !amount || 
              Number(amount) <= 0 || 
              Number(amount) > collateral || 
              Number(amount) > maxWithdrawable ||
              newHealthFactor < 150
            }
          >
            {isWithdrawing ? "Processing..." : "Withdraw XBTC"}
          </Button>

          <div className="pt-2 text-xs text-muted-foreground">
            <p>• You can only withdraw collateral while maintaining a safe health factor.</p>
            <p>• To withdraw more, first repay some of your debt.</p>
            {debt > 0 ? (
              <p>• To withdraw all collateral, you must first repay your entire debt.</p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 