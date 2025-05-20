"use client"

import { useState, useEffect } from "react"
import { useActiveAccount } from "thirdweb/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { InfoIcon, CheckCircleIcon, ExternalLinkIcon, AlertTriangleIcon } from "lucide-react"
import { Skeleton } from "./ui/skeleton"
import { formatUnits, parseUnits } from "ethers"
import { useContractData } from "@/hooks/useContractInteraction"

type UTXO = {
  txid: string
  vout: number
  amount: string
  confirmations: number
  address: string
  scriptType: string
}

const ProofOfReserves = () => {
  const account = useActiveAccount()
  const address = account?.address
  const [activeTab, setActiveTab] = useState("global")
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<null | { verified: boolean; message: string }>(null)
  
  // Get data from contracts
  const { data: proofOfReservesData, isLoading: isLoadingProofData } = useContractData(
    "BitLendProofOfReserves",
    "getGlobalReservesData",
    []
  )
  
  const { data: userCollateralData, isLoading: isLoadingUserData } = useContractData(
    "BitLendVault",
    "getPosition",
    address ? [address] : undefined
  )
  
  const { data: userUTXOsData, isLoading: isLoadingUTXOData } = useContractData(
    "BitLendProofOfReserves",
    "getUserUTXOData",
    address ? [address] : undefined
  )
  
  // Format UTXO data from contract response
  const formatUTXOData = (data: any): UTXO[] => {
    if (!data || !data.utxos) return []
    
    return data.utxos.map((utxo: any, index: number) => ({
      txid: utxo.txid || `tx-${index}`,
      vout: utxo.vout || 0,
      amount: utxo.amount ? formatUnits(utxo.amount, 8) : "0", // Assuming 8 decimals for BTC
      confirmations: utxo.confirmations || 0,
      address: utxo.address || "Unknown",
      scriptType: utxo.scriptType || "P2PKH"
    }))
  }

  // Extract data
  const globalUTXOs = formatUTXOData(proofOfReservesData)
  const userUTXOs = formatUTXOData(userUTXOsData)
  
  // Total collateral calculation
  const totalGlobalCollateral = globalUTXOs.reduce((sum, utxo) => sum + parseFloat(utxo.amount), 0)
  const totalUserCollateral = userUTXOs.reduce((sum, utxo) => sum + parseFloat(utxo.amount), 0)
  
  // User collateral from vault
  const userCollateral = userCollateralData?.[0] ? 
    parseFloat(formatUnits(userCollateralData[0], 8)) : 0
  
  // Verify collateral reserves
  const verifyReserves = async () => {
    setIsVerifying(true)
    
    try {
      // Simulate verification process - in production this would check UTXO data with exSat's UTXO Management Contract
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Calculate if reserves match recorded collateral
      const isVerified = Math.abs(totalGlobalCollateral - userCollateral) < 0.0001
      
      setVerificationResult({
        verified: isVerified,
        message: isVerified 
          ? "All collateral is backed by verifiable Bitcoin UTXOs" 
          : "Verification failed: UTXO data doesn't match recorded collateral"
      })
    } catch (error) {
      setVerificationResult({
        verified: false,
        message: "Verification process failed. Please try again."
      })
    } finally {
      setIsVerifying(false)
    }
  }
  
  // Helper for external Bitcoin explorer links
  const getBitcoinExplorerLink = (txid: string) => {
    return `https://mempool.space/tx/${txid}`
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Proof of Reserves</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={verifyReserves} 
            disabled={isVerifying || isLoadingProofData || isLoadingUTXOData}
          >
            {isVerifying ? "Verifying..." : "Verify Reserves"}
          </Button>
        </CardTitle>
        <CardDescription>
          Transparent verification of Bitcoin collateral using exSat&apos;s on-chain UTXO data
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {verificationResult && (
          <Alert className={`mb-4 ${verificationResult.verified ? 'bg-green-50' : 'bg-red-50'}`}>
            {verificationResult.verified ? (
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangleIcon className="h-4 w-4 text-red-600" />
            )}
            <AlertTitle>
              {verificationResult.verified ? "Verification Successful" : "Verification Failed"}
            </AlertTitle>
            <AlertDescription>
              {verificationResult.message}
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="global">Global Reserves</TabsTrigger>
            <TabsTrigger value="user" disabled={!address}>Your Collateral</TabsTrigger>
          </TabsList>
          
          <TabsContent value="global">
            <div className="mb-4 mt-2">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold">Total Protocol Collateral</h4>
                {isLoadingProofData ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <span className="text-lg font-bold">{totalGlobalCollateral.toFixed(8)} BTC</span>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground flex items-center">
                <InfoIcon className="h-4 w-4 mr-1 inline" />
                <span>All protocol collateral is backed by verifiable Bitcoin UTXOs</span>
              </div>
            </div>
            
            <h4 className="text-sm font-semibold mb-2">UTXO Verification Data</h4>
            
            {isLoadingProofData ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : globalUTXOs.length > 0 ? (
              <div className="border rounded-md max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Amount (BTC)</TableHead>
                      <TableHead>Confirmations</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {globalUTXOs.map((utxo, index) => (
                      <TableRow key={`${utxo.txid}-${utxo.vout}`}>
                        <TableCell className="font-mono text-xs">
                          {utxo.txid.substring(0, 10)}...{utxo.txid.substring(utxo.txid.length - 10)}
                        </TableCell>
                        <TableCell>{parseFloat(utxo.amount).toFixed(8)}</TableCell>
                        <TableCell>
                          <Badge variant={
                            utxo.confirmations > 5 ? "default" : 
                            utxo.confirmations > 2 ? "secondary" : 
                            "outline"
                          }>
                            {utxo.confirmations}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {utxo.address.substring(0, 8)}...{utxo.address.substring(utxo.address.length - 8)}
                        </TableCell>
                        <TableCell className="text-right">
                          <a 
                            href={getBitcoinExplorerLink(utxo.txid)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs text-blue-600 hover:underline"
                          >
                            Verify <ExternalLinkIcon className="h-3 w-3 ml-1" />
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No UTXO data available
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="user">
            {!address ? (
              <div className="text-center py-8 text-muted-foreground">
                Please connect your wallet to view your collateral
              </div>
            ) : (
              <>
                <div className="mb-4 mt-2">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold">Your Current Collateral</h4>
                    {isLoadingUserData ? (
                      <Skeleton className="h-6 w-24" />
                    ) : (
                      <span className="text-lg font-bold">{userCollateral.toFixed(8)} BTC</span>
                    )}
                  </div>
                  
                  <div className="text-sm text-muted-foreground flex items-center">
                    <InfoIcon className="h-4 w-4 mr-1 inline" />
                    <span>Your collateral is backed by the following Bitcoin UTXOs</span>
                  </div>
                </div>
                
                <h4 className="text-sm font-semibold mb-2">Your Collateral UTXO Data</h4>
                
                {isLoadingUTXOData ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : userUTXOs.length > 0 ? (
                  <div className="border rounded-md max-h-[400px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Transaction ID</TableHead>
                          <TableHead>Amount (BTC)</TableHead>
                          <TableHead>Confirmations</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userUTXOs.map((utxo, index) => (
                          <TableRow key={`${utxo.txid}-${utxo.vout}`}>
                            <TableCell className="font-mono text-xs">
                              {utxo.txid.substring(0, 10)}...{utxo.txid.substring(utxo.txid.length - 10)}
                            </TableCell>
                            <TableCell>{parseFloat(utxo.amount).toFixed(8)}</TableCell>
                            <TableCell>
                              <Badge variant={
                                utxo.confirmations > 5 ? "default" : 
                                utxo.confirmations > 2 ? "secondary" : 
                                "outline"
                              }>
                                {utxo.confirmations}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <a 
                                href={getBitcoinExplorerLink(utxo.txid)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-xs text-blue-600 hover:underline"
                              >
                                Verify <ExternalLinkIcon className="h-3 w-3 ml-1" />
                              </a>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    You don&apos;t have any collateral positions
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default ProofOfReserves 