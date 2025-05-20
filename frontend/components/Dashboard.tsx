"use client";

import { useState } from "react"
import { useActiveAccount } from "thirdweb/react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
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
import { BITLEND_CONTRACTS } from "@/config/contracts"
import { CheckCircle, TrendingUp, Shield, Bitcoin } from "lucide-react"

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
        <div>
          <h1 className="text-2xl font-bold">BitLend Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Connected to exSat Network • Vault: {BITLEND_CONTRACTS.BITLEND_VAULT.slice(0, 8)}...{BITLEND_CONTRACTS.BITLEND_VAULT.slice(-6)}
          </p>
        </div>
        <Button onClick={onBridgeClick} variant="outline">Bridge BTC ↔ XBTC</Button>
      </div>

      {/* Market Statistics Panel - Updated with Demo Script Data */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {/* Total Value Locked */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value Locked</CardTitle>
            <Bitcoin className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">$2.3M</div>
            <p className="text-xs text-muted-foreground">
              in verified Bitcoin collateral
            </p>
            <Badge variant="secondary" className="mt-2 text-xs">
              100% UTXO Verified
            </Badge>
          </CardContent>
        </Card>

        {/* UTXO Verification Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">UTXO Verification</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">100%</div>
            <p className="text-xs text-muted-foreground">
              All collateral provably backed by Bitcoin UTXOs
            </p>
            <div className="flex items-center mt-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-xs text-green-600">Real-time verification</span>
            </div>
          </CardContent>
        </Card>

        {/* Interest Rates */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">USDC Borrowing Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">8.5%</div>
            <p className="text-xs text-muted-foreground">
              APY - competitive rates via transparent risk assessment
            </p>
            <Badge variant="outline" className="mt-2 text-xs">
              Dynamic Pricing
            </Badge>
          </CardContent>
        </Card>

        {/* Protocol Security */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protocol Security</CardTitle>
            <Shield className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">Active</div>
            <p className="text-xs text-muted-foreground">
              MEV protection via Rebar Shield
            </p>
            <div className="flex items-center mt-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
              <span className="text-xs text-purple-600">Liquidation protected</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Position Overview */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-6">
        <PositionCard onManage={() => setActiveTab("deposit")} />
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
            {/* Additional Protocol Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">📊 Verified UTXOs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">847</div>
                  <p className="text-sm text-muted-foreground">
                    Bitcoin UTXOs currently securing the protocol
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setActiveTab("overview")}>
                    View UTXO Explorer
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🔄 Active Positions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">124</div>
                  <p className="text-sm text-muted-foreground">
                    Open lending positions with healthy ratios
                  </p>
                  <div className="mt-3 text-xs text-green-600">
                    Average Health Factor: 2.1x
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">⚡ Network Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2 text-green-600">Healthy</div>
                  <p className="text-sm text-muted-foreground">
                    exSat Network operating normally
                  </p>
                  <div className="mt-3 text-xs">
                    Last UTXO sync: 2 minutes ago
                  </div>
                </CardContent>
              </Card>
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