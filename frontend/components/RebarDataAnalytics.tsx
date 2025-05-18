"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MarketData {
  btcPrice: number;
  totalTxs24h: number;
  avgBlockTime: number;
  hashRate: string;
  mempoolSize: number;
  totalLiquidityUSD: number;
}

interface LiquidationRisk {
  address: string;
  collateralValue: number;
  healthFactor: number;
  urgency: 'low' | 'medium' | 'high';
}

export const RebarDataAnalytics = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [marketData, setMarketData] = useState<MarketData>({
    btcPrice: 89450,
    totalTxs24h: 382715,
    avgBlockTime: 10.2,
    hashRate: '510.6 EH/s',
    mempoolSize: 8564,
    totalLiquidityUSD: 842000000
  });
  
  const [recentLiquidations, setRecentLiquidations] = useState([
    { address: '0x742...e9F2', amount: 0.45, value: 40230, timestamp: '2 hours ago' },
    { address: '0x391...a7D3', amount: 0.78, value: 69771, timestamp: '4 hours ago' },
    { address: '0x519...c4F1', amount: 0.23, value: 20573, timestamp: '8 hours ago' },
  ]);
  
  const [liquidationRisks, setLiquidationRisks] = useState<LiquidationRisk[]>([
    { address: '0x871...b3D5', collateralValue: 134500, healthFactor: 142, urgency: 'high' },
    { address: '0x623...a9F2', collateralValue: 89200, healthFactor: 145, urgency: 'medium' },
    { address: '0x159...e7A1', collateralValue: 67300, healthFactor: 147, urgency: 'medium' },
  ]);

  // Mock loading data from Rebar Data API
  useEffect(() => {
    // In a real app, this would fetch from the Rebar Data API
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

  const getHealthFactorColor = (healthFactor: number) => {
    if (healthFactor < 140) return 'text-red-600';
    if (healthFactor < 150) return 'text-amber-600';
    return 'text-green-600';
  };

  const getUrgencyColor = (urgency: 'low' | 'medium' | 'high') => {
    if (urgency === 'high') return 'bg-red-100 text-red-800';
    if (urgency === 'medium') return 'bg-amber-100 text-amber-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <Tabs defaultValue="market" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="market">Market Overview</TabsTrigger>
            <TabsTrigger value="liquidations">Recent Liquidations</TabsTrigger>
            <TabsTrigger value="risks">Liquidation Risks</TabsTrigger>
          </TabsList>
          
          <TabsContent value="market">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <div className="text-sm text-gray-500">BTC Price</div>
                    <div className="text-xl font-bold">${marketData.btcPrice.toLocaleString()}</div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <div className="text-sm text-gray-500">24h Transactions</div>
                    <div className="text-xl font-bold">{marketData.totalTxs24h.toLocaleString()}</div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <div className="text-sm text-gray-500">Avg Block Time</div>
                    <div className="text-xl font-bold">{marketData.avgBlockTime} minutes</div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <div className="text-sm text-gray-500">Hash Rate</div>
                    <div className="text-xl font-bold">{marketData.hashRate}</div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <div className="text-sm text-gray-500">Mempool Size</div>
                    <div className="text-xl font-bold">{marketData.mempoolSize.toLocaleString()} txs</div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <div className="text-sm text-gray-500">Total DeFi Liquidity</div>
                    <div className="text-xl font-bold">${(marketData.totalLiquidityUSD / 1000000).toFixed(1)}M</div>
                  </div>
                </div>
                
                <div className="mt-4 text-xs text-gray-500 text-right">
                  Data provided by Rebar Data API
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="liquidations">
            <Card>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-2 text-left font-medium text-gray-500">Address</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-500">Amount (BTC)</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-500">Value (USD)</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-500">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentLiquidations.map((liquidation, index) => (
                        <tr key={index} className="border-b last:border-b-0">
                          <td className="px-4 py-3 text-left font-medium">{liquidation.address}</td>
                          <td className="px-4 py-3 text-right">{liquidation.amount}</td>
                          <td className="px-4 py-3 text-right">${liquidation.value.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-gray-500">{liquidation.timestamp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 text-xs text-gray-500 text-right">
                  Protected by Rebar Shield
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="risks">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {liquidationRisks.map((risk, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
                      <div>
                        <div className="font-medium">{risk.address}</div>
                        <div className="text-sm text-gray-500">
                          Collateral Value: ${risk.collateralValue.toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`font-medium ${getHealthFactorColor(risk.healthFactor)}`}>
                          Health: {risk.healthFactor}%
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${getUrgencyColor(risk.urgency)}`}>
                          {risk.urgency.toUpperCase()} RISK
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 text-xs text-gray-500 text-right">
                  MEV-protected liquidations available via Rebar Shield
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}; 