"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface BridgeModalProps {
  onClose: () => void;
}

export const BridgeModal = ({ onClose }: BridgeModalProps) => {
  const [bridgeDirection, setBridgeDirection] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [btcAddress, setBtcAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // This is a mock implementation - in a real app, this would call the contract
    setTimeout(() => {
      setIsLoading(false);
      
      if (bridgeDirection === 'deposit') {
        toast({
          title: "Bridge Deposit Initiated",
          description: "Please follow the instructions to complete your BTC deposit.",
        });
      } else {
        toast({
          title: "Withdrawal Initiated",
          description: "Your BTC withdrawal is being processed.",
        });
      }
      
      onClose();
    }, 2000);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bridge BTC ⟷ XBTC</DialogTitle>
          <DialogDescription>
            Convert between Bitcoin and XBTC on exSat Network.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="deposit" onValueChange={setBridgeDirection}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deposit">BTC → XBTC</TabsTrigger>
            <TabsTrigger value="withdraw">XBTC → BTC</TabsTrigger>
          </TabsList>
          
          <form onSubmit={handleSubmit}>
            <TabsContent value="deposit" className="mt-4">
              <div className="space-y-4">
                <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
                  <h4 className="text-sm font-medium text-amber-800">How it works</h4>
                  <p className="text-xs text-amber-700 mt-1">
                    To bridge BTC to XBTC, you'll need to send Bitcoin to a unique deposit address. 
                    Your XBTC will appear in your wallet after the BTC transaction confirms.
                  </p>
                </div>
                
                <div className="mt-2">
                  <Label htmlFor="deposit-amount">Amount (BTC)</Label>
                  <Input
                    id="deposit-amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    type="number"
                    step="0.00000001"
                    min="0"
                  />
                </div>
                
                <Button 
                  className="w-full" 
                  type="submit" 
                  disabled={isLoading || !amount}
                >
                  {isLoading ? "Processing..." : "Generate Deposit Address"}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="withdraw" className="mt-4">
              <div className="space-y-4">
                <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
                  <h4 className="text-sm font-medium text-amber-800">How it works</h4>
                  <p className="text-xs text-amber-700 mt-1">
                    To withdraw BTC, you'll need to provide the BTC address where you want to 
                    receive your Bitcoin. The withdrawal will be processed after confirmation.
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="withdraw-amount">Amount (XBTC)</Label>
                  <Input
                    id="withdraw-amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    type="number"
                    step="0.00000001"
                    min="0"
                  />
                </div>
                
                <div>
                  <Label htmlFor="btc-address">BTC Receive Address</Label>
                  <Input
                    id="btc-address"
                    value={btcAddress}
                    onChange={(e) => setBtcAddress(e.target.value)}
                    placeholder="bc1q..."
                  />
                </div>
                
                <Button 
                  className="w-full" 
                  type="submit" 
                  disabled={isLoading || !amount || !btcAddress}
                >
                  {isLoading ? "Processing..." : "Withdraw to BTC"}
                </Button>
              </div>
            </TabsContent>
          </form>
        </Tabs>
        
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium mb-2">Bridge Information</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            This bridge is powered by exSat Network's decentralized bridge infrastructure. The process typically takes 10-15 minutes for BTC deposits due to Bitcoin's block confirmation time.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 