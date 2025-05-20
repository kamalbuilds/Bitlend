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

const RepayPanel = () => {
  const [amount, setAmount] = useState("");
  const [percentOfDebt, setPercentOfDebt] = useState(100);
  const [isRepaying, setIsRepaying] = useState(false);
  const [transactionSuccess, setTransactionSuccess] = useState(false);
  const [transactionError, setTransactionError] = useState("");
  
  const account = useActiveAccount();
  const address = account?.address;
  
  // Mock data for demo - in production, this would come from contract calls
  const currentDebtAmount = 15000; // $15,000 USDC
  const stablecoinBalance = 20000; // $20,000 USDC
  
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
    if (currentDebtAmount > 0 && value) {
      const percent = (parseFloat(value) / currentDebtAmount) * 100;
      setPercentOfDebt(Math.min(100, Math.max(0, percent)));
    }
  };
  
  const handleSliderChange = (value: number[]) => {
    const percent = value[0];
    setPercentOfDebt(percent);
    
    if (currentDebtAmount > 0) {
      const repayAmount = (currentDebtAmount * percent / 100).toFixed(2);
      setAmount(repayAmount);
    }
  };
  
  const handleMaxClick = () => {
    const maxRepay = Math.min(currentDebtAmount, stablecoinBalance);
    setAmount(maxRepay.toFixed(2));
    setPercentOfDebt((maxRepay / currentDebtAmount) * 100);
  };
  
  const calculateNewHealthFactor = () => {
    // Mock calculation for demo
    const collateralValueUsd = 35000; // $35,000
    const newDebtAmount = currentDebtAmount - (amount ? parseFloat(amount) : 0);
    if (newDebtAmount <= 0) return 1000; // Fully repaid
    return (collateralValueUsd / newDebtAmount) * 100;
  };
  
  const newHealthFactor = calculateNewHealthFactor();
  
  const handleRepay = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setTransactionError("Please enter a valid amount");
      return;
    }
    
    if (parseFloat(amount) > stablecoinBalance) {
      setTransactionError("Amount exceeds your USDC balance");
      return;
    }
    
    if (parseFloat(amount) > currentDebtAmount) {
      setTransactionError("Amount exceeds your current debt");
      return;
    }
    
    try {
      setIsRepaying(true);
      setTransactionError("");
      
      // Mock successful repay for demo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setTransactionSuccess(true);
      setAmount("");
      setPercentOfDebt(100);
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setTransactionSuccess(false);
      }, 5000);
    } catch (error) {
      console.error("Repay error:", error);
      setTransactionError("Failed to repay: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsRepaying(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Repay Debt</CardTitle>
        <CardDescription>
          Repay your USDC debt to maintain a healthy collateral position
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {!address ? (
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                Please connect your wallet to repay debt
              </AlertDescription>
            </Alert>
          ) : currentDebtAmount <= 0 ? (
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                You don't have any outstanding debt to repay
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current Debt</p>
                  <p className="text-lg font-medium">
                    ${currentDebtAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">USDC Balance</p>
                  <p className="text-lg font-medium">
                    ${stablecoinBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
                  </p>
                </div>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-md space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <Label htmlFor="repay-amount">Repay Amount</Label>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="h-auto p-0 text-xs"
                      onClick={handleMaxClick}
                      disabled={isRepaying || stablecoinBalance <= 0 || currentDebtAmount <= 0}
                    >
                      MAX
                    </Button>
                  </div>
                  
                  <div className="relative">
                    <Input
                      id="repay-amount"
                      value={amount}
                      onChange={handleAmountChange}
                      placeholder="0.00"
                      className="pr-16"
                      disabled={isRepaying}
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
                    defaultValue={[100]}
                    value={[percentOfDebt]}
                    max={100}
                    step={1}
                    onValueChange={handleSliderChange}
                    disabled={isRepaying || currentDebtAmount <= 0}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Partial Repayment</span>
                    <span>Full Repayment</span>
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">New Health Factor:</span>
                    <span className="font-medium text-green-600">
                      {newHealthFactor > 999 ? "∞" : newHealthFactor.toFixed(0) + "%"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {parseFloat(amount) >= currentDebtAmount 
                      ? "Full repayment will allow you to withdraw all collateral" 
                      : "Partial repayment improves your position's health factor"}
                  </p>
                </div>
              </div>
              
              {transactionSuccess && (
                <Alert className="bg-green-50 border-green-200">
                  <AlertDescription className="text-green-800">
                    Repayment successful! Your debt has been reduced.
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
                onClick={handleRepay}
                disabled={
                  isRepaying || 
                  !amount || 
                  parseFloat(amount) <= 0 || 
                  parseFloat(amount) > currentDebtAmount ||
                  parseFloat(amount) > stablecoinBalance
                }
              >
                {isRepaying ? "Processing..." : "Repay USDC"}
              </Button>
              
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Important information:</strong>
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Repaying debt will immediately increase your health factor</li>
                  <li>Full repayment will stop interest from accruing</li>
                  <li>You can repay any amount up to your total debt</li>
                  <li>Once fully repaid, you can withdraw all your collateral</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RepayPanel; 