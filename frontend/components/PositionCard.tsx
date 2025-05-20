"use client"

import { useActiveAccount } from "thirdweb/react"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Progress } from "./ui/progress"
import { Skeleton } from "./ui/skeleton"
import { formatUnits } from "ethers"
import { useContractData } from "@/hooks/useContractInteraction"

type PositionCardProps = {
  onManage: () => void
}

const PositionCard = ({ onManage }: PositionCardProps) => {
  const account = useActiveAccount()
  const address = account?.address
  
  // Get position data from vault contract
  const { data: positionData, isLoading } = useContractData(
    "BitLendVault",
    "getPosition",
    address ? [address] : undefined
  )
  
  // Get current BTC price from price oracle
  const { data: btcPrice, isLoading: isLoadingPrice } = useContractData(
    "BitLendPriceOracle",
    "getBTCPrice",
    []
  )
  
  // Format data values
  const collateralAmount = positionData && positionData[0] 
    ? parseFloat(formatUnits(positionData[0], 8)) // Assuming 8 decimals for BTC
    : 0
    
  const debtAmount = positionData && positionData[1] 
    ? parseFloat(formatUnits(positionData[1], 6)) // Assuming 6 decimals for USDC
    : 0
    
  const healthFactor = positionData && positionData[2] 
    ? parseFloat(formatUnits(positionData[2], 0))
    : 0
    
  const lastUpdate = positionData && positionData[3] 
    ? new Date(Number(positionData[3]) * 1000).toLocaleDateString()
    : '-'
  
  // Calculate collateral value
  const btcPriceValue = btcPrice ? parseFloat(formatUnits(btcPrice, 8)) : 0
  const collateralValue = collateralAmount * btcPriceValue
  
  // Calculate liquidation price
  const liquidationPrice = debtAmount > 0 ? (debtAmount / collateralAmount) * (140 / 100) : 0
  
  // Calculate risk percentage (as ratio of current health factor to liquidation threshold)
  const riskPercentage = Math.max(0, Math.min(100, (140 / healthFactor) * 100))
  
  // Determine risk level and corresponding colors
  const getRiskLevel = () => {
    if (healthFactor >= 200) return { level: "Low Risk", color: "bg-green-500", textColor: "text-green-600" }
    if (healthFactor >= 160) return { level: "Medium Risk", color: "bg-yellow-500", textColor: "text-yellow-600" }
    if (healthFactor >= 145) return { level: "High Risk", color: "bg-orange-500", textColor: "text-orange-600" }
    return { level: "Liquidation Risk", color: "bg-red-500", textColor: "text-red-600" }
  }
  
  const riskInfo = getRiskLevel()
  
  // If no position exists, show appropriate message
  if (!isLoading && collateralAmount === 0 && debtAmount === 0) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center py-6">
            <h3 className="text-lg font-medium mb-2">No Active Position</h3>
            <p className="text-muted-foreground mb-4">
              Create a loan position by depositing BTC collateral and borrowing USDC
            </p>
            <Button onClick={onManage}>Create Position</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium">Your Position</h3>
                <p className="text-sm text-muted-foreground">Last updated: {lastUpdate}</p>
              </div>
              <Badge 
                variant={healthFactor < 145 ? "destructive" : "outline"}
                className={riskInfo.textColor}
              >
                {riskInfo.level}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-sm text-muted-foreground">Collateral</div>
                <div className="text-xl font-medium">{collateralAmount.toFixed(6)} BTC</div>
                <div className="text-sm text-muted-foreground">
                  ${collateralValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Borrowed</div>
                <div className="text-xl font-medium">${debtAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                <div className="text-sm text-muted-foreground">
                  {((debtAmount / collateralValue) * 100).toFixed(1)}% of collateral value
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-1">
                <span>Health Factor</span>
                <span className={riskInfo.textColor}>
                  {(healthFactor / 100).toFixed(2)}x
                </span>
              </div>
              <Progress value={riskPercentage} className="h-2" />
              <div className="flex justify-between text-xs mt-1">
                <span className="text-red-600">Liquidation at 1.4x</span>
                <span>Safe {'>'} 2.0x</span>
              </div>
            </div>
            
            <div className="bg-slate-50 p-3 rounded-md mb-4">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium">Liquidation Price</div>
                <div className="font-bold">${liquidationPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {btcPriceValue > 0 ? 
                  `Current price: $${btcPriceValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${((btcPriceValue - liquidationPrice) / btcPriceValue * 100).toFixed(1)}% margin)` : 
                  "Loading current price..."}
              </div>
            </div>
            
            <Button onClick={onManage} className="w-full">
              Manage Position
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default PositionCard 