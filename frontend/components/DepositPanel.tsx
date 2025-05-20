"use client";

import { useState } from "react"
import { useActiveAccount } from "thirdweb/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Alert, AlertDescription } from "./ui/alert"
import { InfoIcon } from "lucide-react"
import { formatUnits, parseUnits } from "ethers"
import { useContractData } from "@/hooks/useContractInteraction"

export interface DepositPanelProps {
  onBridgeClick: () => void;
}

const DepositPanel = ({ onBridgeClick }: DepositPanelProps) => {
  const [amount, setAmount] = useState("")
  const [isDepositing, setIsDepositing] = useState(false)
  const [transactionSuccess, setTransactionSuccess] = useState(false)
  const [transactionError, setTransactionError] = useState("")
  
  const account = useActiveAccount()
  const address = account?.address
  
  // Get user's XBTC balance
  const { data: xbtcBalance, isLoading: isBalanceLoading } = useContractData(
    "XBTC_TOKEN",
    "balanceOf",
    address ? [address] : undefined
  )
  
  // Format balance to readable number
  const formattedBalance = xbtcBalance 
    ? parseFloat(formatUnits(xbtcBalance, 8)).toFixed(8) 
    : "0.00000000"
  
  const handleDepositChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers and decimals
    const value = e.target.value.replace(/[^0-9.]/g, '')
    
    // Ensure only one decimal point
    const parts = value.split('.')
    if (parts.length > 2) {
      return
    }
    
    // Limit to 8 decimal places (BTC standard)
    if (parts.length === 2 && parts[1].length > 8) {
      return
    }
    
    setAmount(value)
  }
  
  const handleMaxClick = () => {
    if (formattedBalance && parseFloat(formattedBalance) > 0) {
      setAmount(formattedBalance)
    }
  }
  
  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setTransactionError("Please enter a valid amount")
      return
    }
    
    try {
      setIsDepositing(true)
      setTransactionError("")
      
      // In a real implementation, you would call something like:
      // const txResult = await sendTransaction(
      //   depositCollateral({
      //     contract: vaultContract,
      //     amount: parseUnits(amount, 8)
      //   })
      // )
      
      // Mock successful deposit for demo
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setTransactionSuccess(true)
      setAmount("")
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setTransactionSuccess(false)
      }, 5000)
    } catch (error) {
      console.error("Deposit error:", error)
      setTransactionError("Failed to deposit: " + (error instanceof Error ? error.message : "Unknown error"))
    } finally {
      setIsDepositing(false)
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Deposit Collateral</CardTitle>
        <CardDescription>
          Deposit XBTC as collateral to enable borrowing stablecoins
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {!address ? (
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                Please connect your wallet to deposit collateral
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Available XBTC Balance
                </p>
                <p className="text-sm font-medium">
                  {isBalanceLoading ? "Loading..." : formattedBalance} XBTC
                </p>
              </div>
              
              <div className="bg-muted/50 p-4 rounded-md">
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="deposit-amount">Deposit Amount</Label>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 text-xs"
                    onClick={handleMaxClick}
                    disabled={isBalanceLoading || parseFloat(formattedBalance) <= 0}
                  >
                    MAX
                  </Button>
                </div>
                
                <div className="flex space-x-2">
                  <div className="relative flex-grow">
                    <Input
                      id="deposit-amount"
                      value={amount}
                      onChange={handleDepositChange}
                      placeholder="0.00000000"
                      className="pr-16"
                      disabled={isDepositing}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      XBTC
                    </div>
                  </div>
                </div>
                
                {parseFloat(formattedBalance) <= 0 && (
                  <p className="text-sm text-amber-600 mt-2">
                    You don't have any XBTC to deposit.{" "}
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-sm" 
                      onClick={onBridgeClick}
                    >
                      Bridge BTC to XBTC
                    </Button>
                  </p>
                )}
              </div>
              
              {transactionSuccess && (
                <Alert className="bg-green-50 border-green-200">
                  <AlertDescription className="text-green-800">
                    Deposit successful! Your collateral has been added.
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
                onClick={handleDeposit}
                disabled={
                  isDepositing || 
                  !amount || 
                  parseFloat(amount) <= 0 || 
                  parseFloat(amount) > parseFloat(formattedBalance)
                }
              >
                {isDepositing ? "Depositing..." : "Deposit Collateral"}
              </Button>
              
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>What happens when you deposit:</strong>
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Your XBTC will be transferred to the BitLend protocol as collateral</li>
                  <li>You will be able to borrow stablecoins against your collateral value</li>
                  <li>Your collateral is backed 1:1 with Bitcoin and verified through exSat's UTXO Management</li>
                  <li>You can withdraw your collateral at any time as long as you maintain a healthy position</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default DepositPanel 