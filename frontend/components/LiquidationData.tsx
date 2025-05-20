"use client"

import { useState } from "react"
import { useActiveAccount } from "thirdweb/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Progress } from "./ui/progress"
import { Skeleton } from "./ui/skeleton"
import { Alert, AlertDescription } from "./ui/alert"
import { formatUnits } from "ethers"
import { useContractData } from "@/hooks/useContractInteraction"

const LiquidationData = () => {
  const [isLoading, setIsLoading] = useState(false)
  
  const account = useActiveAccount()
  
  // Mock data for demo
  const liquidationThreshold = 140 // 140%
  const currentHealthFactor = 175 // 175%
  const riskLevel = currentHealthFactor > 180 ? "Low" : currentHealthFactor > 150 ? "Medium" : "High"
  const riskColor = currentHealthFactor > 180 ? "text-green-600" : currentHealthFactor > 150 ? "text-yellow-600" : "text-red-600"
  const progressColor = currentHealthFactor > 180 ? "bg-green-600" : currentHealthFactor > 150 ? "bg-yellow-600" : "bg-red-600"
  
  // Liquidation metrics
  const marketLiquidationThreshold = 140 // 140%
  const totalActiveLoans = 142
  const totalLoansAtRisk = 12
  const totalValueLiquidated24h = 125000 // $125,000
  
  const handleRefresh = async () => {
    setIsLoading(true)
    
    // Mock API call to get risk data
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setIsLoading(false)
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-xl">Liquidation Risk</CardTitle>
          <CardDescription>
            Risk analytics and liquidation data
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={isLoading}
        >
          {isLoading ? "Refreshing..." : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : account ? (
          <>
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Your Health Factor</span>
                <span className={`text-sm font-medium ${riskColor}`}>
                  {currentHealthFactor}% ({riskLevel} Risk)
                </span>
              </div>
              <Progress 
                value={Math.min(currentHealthFactor, 200)} 
                max={200} 
                className={`h-2 ${progressColor}`} 
              />
              <p className="text-xs text-muted-foreground mt-1">
                Liquidation below {liquidationThreshold}%
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted p-3 rounded-md">
                <p className="text-xs text-muted-foreground mb-1">Market Liquidation Level</p>
                <p className="text-lg font-medium">{marketLiquidationThreshold}%</p>
              </div>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-xs text-muted-foreground mb-1">Loans At Risk</p>
                <p className="text-lg font-medium">{totalLoansAtRisk} / {totalActiveLoans}</p>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground mb-1">Liquidated (24h)</p>
              <p className="text-lg font-medium">${totalValueLiquidated24h.toLocaleString()}</p>
            </div>
            
            <div className="mt-4 text-xs text-muted-foreground">
              <p>Data is refreshed every 5 minutes. Rebar data integration provides real-time mempool insights for liquidation protection.</p>
            </div>
          </>
        ) : (
          <Alert>
            <AlertDescription>
              Connect your wallet to view liquidation risk metrics
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

export default LiquidationData 