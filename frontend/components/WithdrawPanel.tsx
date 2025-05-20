"use client";

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Alert, AlertDescription } from "./ui/alert";
import { InfoIcon, AlertTriangleIcon } from "lucide-react";
import { formatUnits } from "ethers";
import { useContractData } from "@/hooks/useContractInteraction";

interface WithdrawPanelProps {
  onBridgeClick: () => void;
}

const WithdrawPanel = ({ onBridgeClick }: WithdrawPanelProps) => {
  const [amount, setAmount] = useState("");
  const [percentOfCollateral, setPercentOfCollateral] = useState(50);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [transactionSuccess, setTransactionSuccess] = useState(false);
  const [transactionError, setTransactionError] = useState("");
  
  const account = useActiveAccount();
  const address = account?.address;
  
  // Mock data for demo - in production, this would come from contract calls
  const collateralAmount = 0.5; // 0.5 BTC
  const currentDebtAmount = 15000; // $15,000 USDC
  const btcPrice = 70000; // $70,000 per BTC
  const collateralValueUsd = collateralAmount * btcPrice; // $35,000
  const borrowedRatio = (currentDebtAmount / collateralValueUsd) * 100; // 42.8%
  
  // Calculate max withdrawable amount
  const requiredCollateralForDebt = currentDebtAmount / (btcPrice * 0.7); // Required for 70% LTV
  const maxWithdrawableAmount = Math.max(0, collateralAmount - requiredCollateralForDebt);
  const maxWithdrawablePercentage = (maxWithdrawableAmount / collateralAmount) * 100;
  
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers and decimals
    const value = e.target.value.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = value.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit to 8 decimal places (BTC standard)
    if (parts.length === 2 && parts[1].length > 8) {
      return;
    }
    
    setAmount(value);
    
    // Update slider if max withdrawable is valid
    if (collateralAmount > 0 && value) {
      const percent = (parseFloat(value) / collateralAmount) * 100;
      setPercentOfCollateral(Math.min(100, Math.max(0, percent)));
    }
  };
  
  const handleSliderChange = (value: number[]) => {
    const percent = value[0];
    setPercentOfCollateral(percent);
    
    if (collateralAmount > 0) {
      const withdrawAmount = (collateralAmount * percent / 100).toFixed(8);
      setAmount(withdrawAmount);
    }
  };
  
  const handleMaxClick = () => {
    if (maxWithdrawableAmount > 0) {
      setAmount(maxWithdrawableAmount.toFixed(8));
      setPercentOfCollateral(maxWithdrawablePercentage);
    }
  };
  
  const calculateNewHealthFactor = () => {
    if (currentDebtAmount <= 0) return 999; // No debt
    
    const remainingCollateral = collateralAmount - (amount ? parseFloat(amount) : 0);
    if (remainingCollateral <= 0) return 0;
    
    const remainingCollateralValue = remainingCollateral * btcPrice;
    return (remainingCollateralValue / currentDebtAmount) * 100;
  };
  
  const newHealthFactor = calculateNewHealthFactor();
  
  const getHealthStatus = () => {
    if (newHealthFactor >= 180) return { text: "Safe", color: "text-green-600" };
    if (newHealthFactor >= 150) return { text: "Moderate", color: "text-yellow-600" };
    return { text: "Risky", color: "text-red-600" };
  };
  
  const healthStatus = getHealthStatus();
  
  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setTransactionError("Please enter a valid amount");
      return;
    }
    
    if (parseFloat(amount) > collateralAmount) {
      setTransactionError("Amount exceeds your collateral balance");
      return;
    }
    
    if (parseFloat(amount) > maxWithdrawableAmount) {
      setTransactionError("Amount exceeds maximum withdrawable amount");
      return;
    }
    
    try {
      setIsWithdrawing(true);
      setTransactionError("");
      
      // Mock successful withdraw for demo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setTransactionSuccess(true);
      setAmount("");
      setPercentOfCollateral(50);
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setTransactionSuccess(false);
      }, 5000);
    } catch (error) {
      console.error("Withdraw error:", error);
      setTransactionError("Failed to withdraw: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsWithdrawing(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdraw Collateral</CardTitle>
        <CardDescription>
          Withdraw XBTC collateral from your position
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {!address ? (
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                Please connect your wallet to withdraw collateral
              </AlertDescription>
            </Alert>
          ) : collateralAmount <= 0 ? (
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                You don't have any collateral to withdraw
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Available Collateral</p>
                  <p className="text-lg font-medium">
                    {collateralAmount.toFixed(8)} XBTC
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ≈ ${collateralValueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Maximum Withdrawable</p>
                  <p className="text-lg font-medium">
                    {maxWithdrawableAmount.toFixed(8)} XBTC
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {maxWithdrawableAmount > 0 ? `${maxWithdrawablePercentage.toFixed(2)}% of your collateral` : "Repay debt to withdraw"}
                  </p>
                </div>
              </div>
              
              {currentDebtAmount > 0 && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertTriangleIcon className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    You have an outstanding debt of ${currentDebtAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC. 
                    You must maintain sufficient collateral or repay your loan first.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="bg-muted/50 p-4 rounded-md space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <Label htmlFor="withdraw-amount">Withdraw Amount</Label>
                    {maxWithdrawableAmount > 0 && (
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="h-auto p-0 text-xs"
                        onClick={handleMaxClick}
                        disabled={isWithdrawing || maxWithdrawableAmount <= 0}
                      >
                        MAX
                      </Button>
                    )}
                  </div>
                  
                  <div className="relative">
                    <Input
                      id="withdraw-amount"
                      value={amount}
                      onChange={handleAmountChange}
                      placeholder="0.00000000"
                      className="pr-16"
                      disabled={isWithdrawing}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      XBTC
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                  <Slider
                    defaultValue={[50]}
                    value={[percentOfCollateral]}
                    max={100}
                    step={1}
                    onValueChange={handleSliderChange}
                    disabled={isWithdrawing}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Partial Withdrawal</span>
                    <span>Full Withdrawal</span>
                  </div>
                </div>
                
                {currentDebtAmount > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">New Health Factor:</span>
                      <span className={`font-medium ${healthStatus.color}`}>
                        {newHealthFactor.toFixed(0)}% ({healthStatus.text})
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Minimum required: 140%. Liquidation below 140%.
                    </p>
                  </div>
                )}
              </div>
              
              {transactionSuccess && (
                <Alert className="bg-green-50 border-green-200">
                  <AlertDescription className="text-green-800">
                    Withdrawal successful! The XBTC has been sent to your wallet.
                  </AlertDescription>
                </Alert>
              )}
              
              {transactionError && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertDescription className="text-red-800">
                    {transactionError}
                  </AlertDescription>
                </Alert>
              )}
              
              <Button 
                className="w-full" 
                onClick={handleWithdraw}
                disabled={
                  isWithdrawing || 
                  !amount || 
                  parseFloat(amount) <= 0 || 
                  parseFloat(amount) > collateralAmount ||
                  (currentDebtAmount > 0 && parseFloat(amount) > maxWithdrawableAmount)
                }
              >
                {isWithdrawing ? "Processing..." : "Withdraw XBTC"}
              </Button>
              
              <div className="flex justify-between">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={onBridgeClick}
                >
                  Bridge XBTC to BTC
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Important information:</strong>
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Withdrawing reduces your available collateral for borrowing</li>
                  <li>To withdraw all collateral, you must first repay all debt</li>
                  <li>Maintain a healthy position to avoid liquidation</li>
                  <li>You can bridge your XBTC back to BTC after withdrawal</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WithdrawPanel; 