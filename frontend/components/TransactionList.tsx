"use client"

import { useState } from "react"
import { useActiveAccount } from "thirdweb/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { Badge } from "./ui/badge"
import { Skeleton } from "./ui/skeleton"
import { formatUnits } from "ethers"

type Transaction = {
  id: string
  type: 'deposit' | 'withdraw' | 'borrow' | 'repay' | 'liquidate'
  amount: string
  token: string
  timestamp: string
  status: 'confirmed' | 'pending' | 'failed'
  txHash: string
}

const TransactionList = () => {
  const activeAccount = useActiveAccount();
  const address = activeAccount?.address;
  const [isLoading, setIsLoading] = useState(false)
  
  // This would normally come from a hook or API call
  // For demonstration, we'll use mock data
  const transactions: Transaction[] = [
    {
      id: '1',
      type: 'deposit',
      amount: '0.50000000',
      token: 'BTC',
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      status: 'confirmed',
      txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    },
    {
      id: '2',
      type: 'borrow',
      amount: '5000.00',
      token: 'USDC',
      timestamp: new Date(Date.now() - 86400000 * 2 + 3600000).toISOString(),
      status: 'confirmed',
      txHash: '0x2345678901abcdef2345678901abcdef2345678901abcdef2345678901abcdef'
    },
    {
      id: '3',
      type: 'repay',
      amount: '1000.00',
      token: 'USDC',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      status: 'confirmed',
      txHash: '0x3456789012abcdef3456789012abcdef3456789012abcdef3456789012abcdef'
    },
    {
      id: '4',
      type: 'withdraw',
      amount: '0.10000000',
      token: 'BTC',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      status: 'confirmed',
      txHash: '0x4567890123abcdef4567890123abcdef4567890123abcdef4567890123abcdef'
    },
    {
      id: '5',
      type: 'deposit',
      amount: '0.25000000',
      token: 'BTC',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      status: 'pending',
      txHash: '0x5678901234abcdef5678901234abcdef5678901234abcdef5678901234abcdef'
    }
  ]
  
  // Helper functions
  const getTypeLabel = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit': return 'Deposit'
      case 'withdraw': return 'Withdraw'
      case 'borrow': return 'Borrow'
      case 'repay': return 'Repay'
      case 'liquidate': return 'Liquidation'
      default: return type
    }
  }
  
  const getTypeColor = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit': return 'bg-green-100 text-green-800'
      case 'withdraw': return 'bg-orange-100 text-orange-800'
      case 'borrow': return 'bg-blue-100 text-blue-800'
      case 'repay': return 'bg-purple-100 text-purple-800'
      case 'liquidate': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'confirmed': return <Badge variant="outline" className="bg-green-100 text-green-800">Confirmed</Badge>
      case 'pending': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'failed': return <Badge variant="outline" className="bg-red-100 text-red-800">Failed</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }
  
  const formatTxHash = (hash: string) => {
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`
  }
  
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }
  
  const getExplorerLink = (txHash: string) => {
    // This would be the actual block explorer base URL
    return `https://scan-testnet.exsat.network/tx/${txHash}`
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>
          Your BitLend protocol interaction history
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {!address ? (
          <div className="text-center py-8 text-muted-foreground">
            Please connect your wallet to view your transaction history
          </div>
        ) : isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions found
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(tx.type)}`}>
                        {getTypeLabel(tx.type)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {tx.amount} {tx.token}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatTimestamp(tx.timestamp)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(tx.status)}
                    </TableCell>
                    <TableCell>
                      <a 
                        href={getExplorerLink(tx.txHash)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {formatTxHash(tx.txHash)}
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TransactionList 