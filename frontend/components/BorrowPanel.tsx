"use client";

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Alert, AlertDescription } from "./ui/alert";
import { InfoIcon } from "lucide-react";
import { formatUnits } from "ethers";
import { useContractData } from "@/hooks/useContractInteraction";

const BorrowPanel = () => {
  const [amount, setAmount] = useState("");
  const [percentOfMax, setPercentOfMax] = useState(50);
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [transactionSuccess, setTransactionSuccess] = useState(false);
  const [transactionError, setTransactionError] = useState("");
  
  const account = useActiveAccount();
  const address = account?.address;
  
  // Mock data for demo - in production, this would come from contract calls
  const collateralAmount = 0.5; // 0.5 BTC
  const currentDebtAmount = 15000; // $15,000 USDC
  const btcPrice = 70000; // $70,000 per BTC
  const collateralValueUsd = collateralAmount * btcPrice; // $35,000
  const maxLTV = 0.7; // 70% maximum LTV
  const maxBorrowAmount = Math.max(0, (collateralValueUsd * maxLTV) - currentDebtAmount); // $9,500
  
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers and decimals
    const value = e.target.value.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = value.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit to 2 decimal places (USDC standard)
    if (parts.length === 2 && parts[1].length > 2) {
      return;
    }
    
    setAmount(value);
    
    // Update slider
    if (maxBorrowAmount > 0 && value) {
      const percent = (parseFloat(value) / maxBorrowAmount) * 100;
      setPercentOfMax(Math.min(100, Math.max(0, percent)));
    }
  };
  
  const handleSliderChange = (value: number[]) => {
    const percent = value[0];
    setPercentOfMax(percent);
    
    if (maxBorrowAmount > 0) {
      const borrowAmount = (maxBorrowAmount * percent / 100).toFixed(2);
      setAmount(borrowAmount);
    }
  };
  
  const calculateNewHealthFactor = () => {
    if (collateralValueUsd === 0) return 0;
    
    const newDebtAmount = currentDebtAmount + (amount ? parseFloat(amount) : 0);
    return (collateralValueUsd / newDebtAmount) * 100;
  };
  
  const newHealthFactor = calculateNewHealthFactor();
  
  const getHealthStatus = () => {
    if (newHealthFactor >= 180) return { text: "Safe", color: "text-green-600" };
    if (newHealthFactor >= 150) return { text: "Moderate", color: "text-yellow-600" };
    return { text: "Risky", color: "text-red-600" };
  };
  
  const healthStatus = getHealthStatus();
  
  const handleBorrow = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setTransactionError("Please enter a valid amount");
      return;
    }
    
    if (parseFloat(amount) > maxBorrowAmount) {
      setTransactionError("Amount exceeds maximum borrowable amount");
      return;
    }
    
    try {
      setIsBorrowing(true);
      setTransactionError("");
      
      // Mock successful borrow for demo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setTransactionSuccess(true);
      setAmount("");
      setPercentOfMax(50);
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setTransactionSuccess(false);
      }, 5000);
    } catch (error) {
      console.error("Borrow error:", error);
      setTransactionError("Failed to borrow: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsBorrowing(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Borrow Stablecoins</CardTitle>
        <CardDescription>
          Borrow USDC against your XBTC collateral
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {!address ? (
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                Please connect your wallet to borrow stablecoins
              </AlertDescription>
            </Alert>
          ) : collateralAmount <= 0 ? (
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                You need to deposit collateral before borrowing
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Collateral Value</p>
                  <p className="text-lg font-medium">
                    ${collateralValueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {collateralAmount.toFixed(8)} XBTC
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Debt</p>
                  <p className="text-lg font-medium">
                    ${currentDebtAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Max Available: ${maxBorrowAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-md space-y-4">
                <div>
                  <Label htmlFor="borrow-amount">Borrow Amount (USDC)</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="borrow-amount"
                      value={amount}
                      onChange={handleAmountChange}
                      placeholder="0.00"
                      className="pr-16"
                      disabled={isBorrowing}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      USDC
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
                    value={[percentOfMax]}
                    max={100}
                    step={1}
                    onValueChange={handleSliderChange}
                    disabled={isBorrowing || maxBorrowAmount <= 0}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Conservative</span>
                    <span>Aggressive</span>
                  </div>
                </div>
                
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
              </div>
              
              {transactionSuccess && (
                <Alert className="bg-green-50 border-green-200">
                  <AlertDescription className="text-green-800">
                    Borrow successful! The USDC has been sent to your wallet.
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
                onClick={handleBorrow}
                disabled={
                  isBorrowing || 
                  !amount || 
                  parseFloat(amount) <= 0 || 
                  parseFloat(amount) > maxBorrowAmount ||
                  maxBorrowAmount <= 0
                }
              >
                {isBorrowing ? "Borrowing..." : "Borrow USDC"}
              </Button>
              
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Important information:</strong>
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Borrowed funds will be sent directly to your wallet</li>
                  <li>Interest accrues over time on your borrowed balance</li>
                  <li>Maintain a health factor above 140% to avoid liquidation</li>
                  <li>You can repay your loan at any time</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BorrowPanel; 