"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import DepositPanel from './DepositPanel';
import BorrowPanel from './BorrowPanel';
import RepayPanel from './RepayPanel';
import WithdrawPanel from './WithdrawPanel';
import { RebarDataAnalytics } from './RebarDataAnalytics';

interface DashboardProps {
  address: string;
  onBridgeClick: () => void;
}

export const Dashboard = ({ address, onBridgeClick }: DashboardProps) => {
  // Mock data - in a real app, this would come from the smart contracts
  const [collateralAmount, setCollateralAmount] = useState(0.5);
  const [collateralValueUsd, setCollateralValueUsd] = useState(35000);
  const [borrowedAmount, setBorrowedAmount] = useState(15000);
  const [healthFactor, setHealthFactor] = useState(175);
  const [healthStatus, setHealthStatus] = useState('Healthy');
  const [maxBorrowAmount, setMaxBorrowAmount] = useState(8333);

  // Health factor styling
  const getHealthColor = () => {
    if (healthFactor > 175) return 'bg-green-500';
    if (healthFactor > 150) return 'bg-yellow-500';
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
                {collateralAmount} XBTC
              </p>
              <p className="text-sm text-gray-500 mt-1">
                ≈ ${collateralValueUsd.toLocaleString()}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Borrowed</h3>
              <p className="text-2xl font-bold">
                ${borrowedAmount.toLocaleString()} USDC
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Max available: ${maxBorrowAmount.toLocaleString()}
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
          <DepositPanel userAddress={address} />
        </TabsContent>
        <TabsContent value="borrow">
          <BorrowPanel 
            userAddress={address}
            maxBorrow={maxBorrowAmount}
          />
        </TabsContent>
        <TabsContent value="repay">
          <RepayPanel 
            userAddress={address}
            currentDebt={borrowedAmount}
          />
        </TabsContent>
        <TabsContent value="withdraw">
          <WithdrawPanel 
            userAddress={address}
            currentCollateral={collateralAmount}
            currentDebt={borrowedAmount}
          />
        </TabsContent>
      </Tabs>

      {/* Rebar Data Analytics Integration */}
      <Card>
        <CardHeader>
          <CardTitle>Market Analytics</CardTitle>
          <CardDescription>Powered by Rebar Data</CardDescription>
        </CardHeader>
        <CardContent>
          <RebarDataAnalytics />
        </CardContent>
      </Card>
    </div>
  );
}; 