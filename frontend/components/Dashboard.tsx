"use client";

import { useState } from "react"
import { useActiveAccount } from "thirdweb/react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import PositionCard from "./PositionCard"
import ProofOfReserves from "./ProofOfReserves"
import LiquidationData from "./LiquidationData"
import MarketStats from "./MarketStats"
import TransactionList from "./TransactionList"
import DepositPanel from "./DepositPanel"
import BorrowPanel from "./BorrowPanel"
import RepayPanel from "./RepayPanel"
import WithdrawPanel from "./WithdrawPanel"
import UTXOViewer from "./UTXOViewer"

type DashboardProps = {
  address?: string;
  onBridgeClick: () => void;
}

export const Dashboard = ({ address, onBridgeClick }: DashboardProps) => {
  const [activeTab, setActiveTab] = useState("overview")
  const account = useActiveAccount()
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">BitLend Dashboard</h1>
        <Button onClick={onBridgeClick} variant="outline">Bridge BTC ↔ XBTC</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <PositionCard onManage={() => setActiveTab("deposit")} />
        <MarketStats />
        <LiquidationData />
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deposit">Deposit</TabsTrigger>
          <TabsTrigger value="borrow">Borrow</TabsTrigger>
          <TabsTrigger value="repay">Repay</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-6">
            <ProofOfReserves />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UTXOViewer />
              <TransactionList />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="deposit">
          <DepositPanel onBridgeClick={onBridgeClick} />
        </TabsContent>
        
        <TabsContent value="borrow">
          <BorrowPanel />
        </TabsContent>
        
        <TabsContent value="repay">
          <RepayPanel />
        </TabsContent>
        
        <TabsContent value="withdraw">
          <WithdrawPanel onBridgeClick={onBridgeClick} />
        </TabsContent>
      </Tabs>
    </div>
  )
} 