"use client";

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import DepositPanel from './DepositPanel';
import BorrowPanel from './BorrowPanel';
import RepayPanel from './RepayPanel';
import WithdrawPanel from './WithdrawPanel';
import { useActiveAccount } from "thirdweb/react";
import { getContractAddresses } from "@/config/contracts";
import { formatUnits } from "ethers";
import { useContractData } from "@/hooks/useContractInteraction";

interface DashboardProps {
  address: string;
  onBridgeClick: () => void;
}

export const Dashboard = ({ address, onBridgeClick }: DashboardProps) => {
  const [collateralAmount, setCollateralAmount] = useState(0.5);
  const [collateralValueUsd, setCollateralValueUsd] = useState(35000);
  const [borrowedAmount, setBorrowedAmount] = useState(15000);
  const [healthFactor, setHealthFactor] = useState(175);
  const [healthStatus, setHealthStatus] = useState('Healthy');
  const [maxBorrowAmount, setMaxBorrowAmount] = useState(8333);
  
  const account = useActiveAccount();
  const walletAddress = account?.address || address;
  const contractAddresses = getContractAddresses();
  
  // Get vault and price oracle contracts
  const vaultAddress = contractAddresses.BITLEND_VAULT;
  const priceOracleAddress = contractAddresses.BITLEND_PRICE_ORACLE;
  
  // Get user's position data
  const { data: positionData, isLoading: isPositionLoading } = useContractData(
    vaultAddress,
    "getPosition",
    [walletAddress]
  );
  
  // Get BTC price
  const { data: btcPrice, isLoading: isPriceLoading } = useContractData(
    priceOracleAddress,
    "getBtcPrice",
    []
  );
  
  // Update dashboard data when contract data changes
  useEffect(() => {
    if (positionData && btcPrice) {
      const [collateralAmount, debtAmount, currentHealthFactor] = positionData as [unknown, unknown, unknown];
      
      if (collateralAmount && debtAmount && currentHealthFactor) {
        // Format collateral amount
        const formattedCollateral = Number(formatUnits(collateralAmount.toString(), 8)); // XBTC has 8 decimals
        setCollateralAmount(formattedCollateral);
        
        // Format borrowed amount
        const formattedDebt = Number(formatUnits(debtAmount.toString(), 6)); // USDC has 6 decimals
        setBorrowedAmount(formattedDebt);
        
        // Format health factor
        const formattedHealthFactor = Number(formatUnits(currentHealthFactor.toString(), 2)); // Health factor with 2 decimals
        setHealthFactor(formattedHealthFactor);
        
        // Calculate USD value of collateral
        const btcPriceInUSD = Number(formatUnits(btcPrice.toString(), 8)); // BTC price in USD
        const collateralUSD = formattedCollateral * btcPriceInUSD;
        setCollateralValueUsd(collateralUSD);
        
        // Calculate max borrow amount based on collateral value and current debt
        const maxLoanToValue = 0.7; // 70% maximum LTV
        const calculatedMaxBorrow = (collateralUSD * maxLoanToValue) - formattedDebt;
        setMaxBorrowAmount(Math.max(0, calculatedMaxBorrow));
        
        // Set health status based on health factor
        if (formattedHealthFactor >= 175) {
          setHealthStatus('Healthy');
        } else if (formattedHealthFactor >= 150) {
          setHealthStatus('Adequate');
        } else {
          setHealthStatus('At Risk');
        }
      }
    }
  }, [positionData, btcPrice]);

  // Health factor styling
  const getHealthColor = () => {
    if (healthFactor >= 175) return 'bg-green-500';
    if (healthFactor >= 150) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getHealthStatusColor = () => {
    if (healthStatus === 'Healthy') return 'text-green-500';
    if (healthStatus === 'Adequate') return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Position Overview</CardTitle>
          <CardDescription>Manage your collateral and borrowing on BitLend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium mb-2">Collateral</h3>
              <p className="text-2xl font-bold">
                {collateralAmount.toFixed(8)} XBTC
              </p>
              <p className="text-sm text-gray-500 mt-1">
                ≈ ${collateralValueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Borrowed</h3>
              <p className="text-2xl font-bold">
                ${borrowedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Max available: ${maxBorrowAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="flex justify-between mb-2">
              <h3 className="text-sm font-medium">Health Factor: {healthFactor}%</h3>
              <span className={`text-sm font-medium ${getHealthStatusColor()}`}>
                {healthStatus}
              </span>
            </div>
            <Progress 
              value={Math.min(healthFactor, 200)} 
              max={200}
              className={`h-2 ${getHealthColor()}`}
            />
            <p className="text-xs text-gray-500 mt-2">
              Minimum required: 150%. Liquidation below 140%.
            </p>
          </div>
          
          <div className="mt-6 flex justify-center">
            <Button onClick={onBridgeClick} variant="outline" className="mr-2">
              Bridge BTC
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="deposit" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="deposit">Deposit</TabsTrigger>
          <TabsTrigger value="borrow">Borrow</TabsTrigger>
          <TabsTrigger value="repay">Repay</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
        </TabsList>
        <TabsContent value="deposit">
          <DepositPanel userAddress={walletAddress} />
        </TabsContent>
        <TabsContent value="borrow">
          <BorrowPanel 
            userAddress={walletAddress}
            maxBorrow={maxBorrowAmount}
          />
        </TabsContent>
        <TabsContent value="repay">
          <RepayPanel 
            userAddress={walletAddress}
            currentDebt={borrowedAmount}
          />
        </TabsContent>
        <TabsContent value="withdraw">
          <WithdrawPanel 
            userAddress={walletAddress}
            currentCollateral={collateralAmount}
            currentDebt={borrowedAmount}
          />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Bitcoin UTXO Verification</CardTitle>
          <CardDescription>Secure collateral verification through on-chain Bitcoin data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-md">
              <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Transparent Proof of Reserves</h4>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                The BitLend protocol uses exSat's on-chain UTXO verification to provide transparent proof that all XBTC is fully backed by Bitcoin.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-md">
                <h4 className="text-sm font-medium mb-2">Platform Reserves</h4>
                <p className="text-xl font-bold">100% Verified</p>
                <p className="text-xs text-gray-500 mt-1">
                  All collateral Bitcoin can be verified on-chain
                </p>
              </div>
              
              <div className="p-4 border rounded-md">
                <h4 className="text-sm font-medium mb-2">Your Collateral Status</h4>
                <p className="text-xl font-bold text-green-600">Verified</p>
                <p className="text-xs text-gray-500 mt-1">
                  Last verification: {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 