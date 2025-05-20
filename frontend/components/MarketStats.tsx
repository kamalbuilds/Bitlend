"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Skeleton } from "./ui/skeleton"
import { formatUnits } from "ethers"
import { useContractData } from "@/hooks/useContractInteraction"

const MarketStats = () => {
  // Get total value locked from vault contract
  const { data: totalValueLocked, isLoading: isLoadingTVL } = useContractData(
    "BitLendVault",
    "getTotalCollateralLocked",
    []
  )
  
  // Get total borrows from vault contract
  const { data: totalBorrows, isLoading: isLoadingBorrows } = useContractData(
    "BitLendVault",
    "getTotalBorrows",
    []
  )
  
  // Get active borrows count
  const { data: activeBorrowsCount, isLoading: isLoadingCount } = useContractData(
    "BitLendVault",
    "getActiveBorrowsCount",
    []
  )
  
  // Get current interest rate
  const { data: interestRate, isLoading: isLoadingRate } = useContractData(
    "BitLendVault",
    "getBorrowInterestRate",
    []
  )
  
  // Get current BTC price from price oracle
  const { data: btcPrice, isLoading: isLoadingPrice } = useContractData(
    "BitLendPriceOracle",
    "getBTCPrice",
    []
  )
  
  // Format the data
  const tvlBTC = totalValueLocked ? parseFloat(formatUnits(totalValueLocked, 8)) : 0
  const tvlUSD = tvlBTC * (btcPrice ? parseFloat(formatUnits(btcPrice, 8)) : 0)
  
  const borrowsUSD = totalBorrows ? parseFloat(formatUnits(totalBorrows, 6)) : 0
  const activeBorrowers = activeBorrowsCount ? Number(activeBorrowsCount) : 0
  
  const currentInterestRate = interestRate ? parseFloat(formatUnits(interestRate, 2)) : 0
  const currentPrice = btcPrice ? parseFloat(formatUnits(btcPrice, 8)) : 0
  
  // Calculate utilization rate
  const utilizationRate = tvlUSD > 0 ? (borrowsUSD / tvlUSD) * 100 : 0
  
  // Historical data for charts (mock data for now)
  const historicalTVL = [
    { date: "2023-09-01", value: tvlUSD * 0.7 },
    { date: "2023-10-01", value: tvlUSD * 0.8 },
    { date: "2023-11-01", value: tvlUSD * 0.9 },
    { date: "2023-12-01", value: tvlUSD * 0.95 },
    { date: "2024-01-01", value: tvlUSD }
  ]
  
  const historicalInterestRates = [
    { date: "2023-09-01", value: currentInterestRate * 1.2 },
    { date: "2023-10-01", value: currentInterestRate * 1.1 },
    { date: "2023-11-01", value: currentInterestRate * 1.05 },
    { date: "2023-12-01", value: currentInterestRate * 1.02 },
    { date: "2024-01-01", value: currentInterestRate }
  ]
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>BitLend Market Statistics</CardTitle>
        <CardDescription>
          Protocol-wide metrics and market data
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Total Value Locked</div>
            {isLoadingTVL ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-2xl font-bold">${tvlUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            )}
            <div className="text-xs text-muted-foreground">
              {tvlBTC.toFixed(4)} BTC
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Total Borrows</div>
            {isLoadingBorrows ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-2xl font-bold">${borrowsUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            )}
            <div className="text-xs text-muted-foreground">
              {activeBorrowers} active positions
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Utilization Rate</div>
            {isLoadingTVL || isLoadingBorrows ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-2xl font-bold">{utilizationRate.toFixed(2)}%</div>
            )}
            <div className="text-xs text-muted-foreground">
              Of available collateral
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">BTC Price</div>
            {isLoadingPrice ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-2xl font-bold">${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            )}
            <div className="text-xs text-muted-foreground">
              Current Oracle Price
            </div>
          </div>
        </div>
        
        <div className="mt-8">
          <h3 className="text-lg font-medium mb-4">Market Health</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium mb-2">Current Interest Rate</h4>
              {isLoadingRate ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold">{currentInterestRate.toFixed(2)}%</span>
                  <span className="ml-2 text-sm text-muted-foreground">APR</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                Variable rate based on utilization
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Collateralization Ratio</h4>
              <div className="flex items-baseline">
                <span className="text-3xl font-bold">140%</span>
                <span className="ml-2 text-sm text-muted-foreground">minimum</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Positions are liquidated below this threshold
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Protocol Parameters</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 text-sm">
            <div>
              <div className="text-muted-foreground">Liquidation Threshold</div>
              <div>140%</div>
            </div>
            
            <div>
              <div className="text-muted-foreground">Liquidation Penalty</div>
              <div>5%</div>
            </div>
            
            <div>
              <div className="text-muted-foreground">Max LTV Ratio</div>
              <div>70%</div>
            </div>
            
            <div>
              <div className="text-muted-foreground">Oracle Update Frequency</div>
              <div>5 minutes</div>
            </div>
            
            <div>
              <div className="text-muted-foreground">Min Borrow Amount</div>
              <div>100 USDC</div>
            </div>
            
            <div>
              <div className="text-muted-foreground">Protocol Fee</div>
              <div>0.1%</div>
            </div>
          </div>
        </div>
        
        {/* Historical TVL chart would go here in a real implementation */}
        <div className="mt-8">
          <div className="h-40 bg-slate-100 rounded-lg flex items-center justify-center">
            <div className="text-muted-foreground text-sm">
              Historical TVL Chart - Data Visualization
            </div>
          </div>
          <div className="mt-2 text-center text-xs text-muted-foreground">
            Total Value Locked (TVL) 30-day history
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default MarketStats 