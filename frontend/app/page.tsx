"use client";

import { useState } from "react"
import { useActiveAccount } from "thirdweb/react"
import { ConnectButton } from "@/components/ConnectButton"
import { Dashboard } from "@/components/Dashboard"
import { BridgeModal } from "@/components/BridgeModal"
import { Button } from "@/components/ui/button"

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
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Welcome to BitLend</h2>
          <p className="text-lg text-muted-foreground max-w-lg mb-8">
            A transparent Bitcoin-backed lending protocol on exSat Network. 
            Deposit BTC as collateral and borrow stablecoins.
          </p>
          <Button onClick={handleBridgeClick} size="lg">
            Learn How to Bridge BTC
          </Button>
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
