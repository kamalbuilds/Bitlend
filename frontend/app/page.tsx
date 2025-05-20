"use client";

import { useState } from "react"
import { useActiveAccount } from "thirdweb/react"
import { Dashboard } from "@/components/Dashboard"
import { BridgeModal } from "@/components/BridgeModal"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BITLEND_CONTRACTS } from "@/config/contracts"

export default function Home() {
  const [showBridgeModal, setShowBridgeModal] = useState(false)
  
  const account = useActiveAccount()
  const address = account?.address
  
  const handleBridgeClick = () => {
    setShowBridgeModal(true)
  }
  
  return (
    <main className="flex min-h-screen flex-col px-4 md:px-8 py-8">
      
      {!address ? (
        <div className="flex flex-col items-center justify-center text-center py-16 md:py-24">
          <div className="max-w-4xl mx-auto space-y-8">
            <div>
              <Badge variant="secondary" className="mb-4">Powered by exSat Network</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Welcome to BitLend</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                The first transparent Bitcoin-backed lending protocol on exSat Network. 
                Leverage Bitcoin UTXOs for verifiable collateral and borrow stablecoins with complete transparency.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🔗 UTXO Verification</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Real-time Bitcoin UTXO verification through exSat's on-chain indexing
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🌉 Trustless Bridge</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Secure BTC to XBTC conversion using exSat's decentralized bridge
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🛡️ MEV Protection</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Protected liquidations with Rebar Shield integration
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-4">
              <Button onClick={handleBridgeClick} size="lg" className="mr-4">
                Get Started - Bridge BTC
              </Button>
              <div className="text-xs text-muted-foreground">
                <p>Protocol Contracts:</p>
                <p>Vault: {BITLEND_CONTRACTS.BITLEND_VAULT}</p>
                <p>XBTC Token: {BITLEND_CONTRACTS.XBTC_TOKEN}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Dashboard 
          address={address}
          onBridgeClick={handleBridgeClick}
        />
      )}
      
      <BridgeModal
        isOpen={showBridgeModal}
        onClose={() => setShowBridgeModal(false)}
      />
    </main>
  )
}
