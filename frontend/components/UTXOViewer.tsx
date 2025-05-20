"use client"

import { useState } from "react"
import { useActiveAccount } from "thirdweb/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { Skeleton } from "./ui/skeleton"
import { ExternalLinkIcon } from "lucide-react"

type UTXO = {
  txid: string
  vout: number
  amount: string
  confirmations: number
  address: string
}

const UTXOViewer = () => {
  const [utxos, setUtxos] = useState<UTXO[]>([
    // Mock UTXO data for demonstration
    {
      txid: "f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16",
      vout: 0,
      amount: "0.15000000",
      confirmations: 745632,
      address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
    },
    {
      txid: "a1075db55d416d3ca199f55b6084e2115b9345e16c5cf302fc80e9d5fbf5d48d",
      vout: 1,
      amount: "0.35000000",
      confirmations: 3254,
      address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
    }
  ])
  const [isLoading, setIsLoading] = useState(false)

  const account = useActiveAccount()

  const truncateTxid = (txid: string) => {
    if (!txid) return ""
    return `${txid.substring(0, 10)}...${txid.substring(txid.length - 8)}`
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setIsLoading(false)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-xl">UTXO Verification</CardTitle>
          <CardDescription>
            Raw Bitcoin UTXO data verified through exSat
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
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-4">
              These are the Bitcoin UTXOs that back the XBTC token supply on exSat Network. Each UTXO represents a Bitcoin transaction output.
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Transaction ID</TableHead>
                    <TableHead className="text-right">Output</TableHead>
                    <TableHead className="text-right">Amount (BTC)</TableHead>
                    <TableHead className="text-right">Confirmations</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {utxos.map((utxo) => (
                    <TableRow key={`${utxo.txid}-${utxo.vout}`}>
                      <TableCell className="font-mono text-xs">
                        {truncateTxid(utxo.txid)}
                      </TableCell>
                      <TableCell className="text-right">{utxo.vout}</TableCell>
                      <TableCell className="text-right">{utxo.amount}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={utxo.confirmations > 6 ? "secondary" : "outline"}>
                          {utxo.confirmations.toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <a 
                          href={`https://mempool.space/tx/${utxo.txid}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                        >
                          View <ExternalLinkIcon className="h-3 w-3" />
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="text-xs text-muted-foreground mt-3">
              Total UTXOs: {utxos.length} | Total BTC: {utxos.reduce((sum, utxo) => sum + parseFloat(utxo.amount), 0).toFixed(8)}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default UTXOViewer 