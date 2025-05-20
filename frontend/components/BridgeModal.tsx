"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useActiveAccount } from "thirdweb/react";
import { getContractAddresses } from "@/config/contracts";
import { parseUnits, formatUnits } from "ethers";
import { 
  useContractData, 
  useBridgeFlow 
} from "@/hooks/useContractInteraction";

interface BridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BridgeModal = ({ isOpen, onClose }: BridgeModalProps) => {
  const [bridgeDirection, setBridgeDirection] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [btcAddress, setBtcAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gasLevel, setGasLevel] = useState('fast'); // 'slow' or 'fast'
  const [depositAddress, setDepositAddress] = useState('');
  const { toast } = useToast();
  const account = useActiveAccount();
  const walletAddress = account?.address;

  // Get contract addresses
  const contractAddresses = getContractAddresses();
  const bridgeAddress = contractAddresses.BITLEND_BRIDGE;
  const xbtcAddress = contractAddresses.XBTC_TOKEN;
  
  // Get user's BTC deposit address if available
  const { data: userBtcAddress, isLoading: isAddressLoading } = useContractData(
    bridgeAddress,
    "getUserBtcAddress",
    walletAddress ? [walletAddress] : []
  );
  
  // Set up the bridge flow
  const { 
    registerBtcAddress, 
    withdrawToBtc, 
    isRegistering, 
    isProcessing 
  } = useBridgeFlow(bridgeAddress, xbtcAddress);

  // Handle deposit generation (in a production app, this would be handled by a backend service)
  const handleGenerateDeposit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to deposit",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // In a real application, this would either:
      // 1. Call an API endpoint that would generate a BTC deposit address with the exSat bridge
      // 2. Or use registerBtcAddress if the user already has a registered BTC address
      
      // For demo purposes, generate a mock BTC address
      const mockDepositAddress = "bc1q" + Math.random().toString(36).substring(2, 15) + 
                                Math.random().toString(36).substring(2, 15);
      
      setDepositAddress(mockDepositAddress);
      
      toast({
        title: "Deposit Address Generated",
        description: "Send BTC to the generated address to receive XBTC on exSat.",
      });
    } catch (error) {
      console.error("Deposit generation error:", error);
      toast({
        title: "Failed to generate deposit address",
        description: "There was an error generating your BTC deposit address.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle XBTC withdrawal to BTC
  const handleWithdraw = async () => {
    if (!amount || Number(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to withdraw",
        variant: "destructive",
      });
      return;
    }

    if (!btcAddress) {
      toast({
        title: "BTC address required",
        description: "Please enter a Bitcoin address to receive your withdrawal",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Register BTC address if needed
      const btcAddressValue = Array.isArray(userBtcAddress) && userBtcAddress.length > 0 ? userBtcAddress[0] : null;
      if (!btcAddressValue || btcAddressValue === '0x0' || btcAddressValue === '') {
        await registerBtcAddress(btcAddress);
      }
      
      // Execute the withdrawal using our custom hook
      await withdrawToBtc(amount);
      
      toast({
        title: "Withdrawal Initiated",
        description: `Your withdrawal of ${amount} XBTC to ${btcAddress} has been initiated.`,
      });
      
      onClose();
    } catch (error) {
      console.error("Withdrawal error:", error);
      toast({
        title: "Withdrawal failed",
        description: "Failed to withdraw XBTC. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (bridgeDirection === 'deposit') {
      handleGenerateDeposit();
    } else {
      handleWithdraw();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
                    disabled={isLoading || isProcessing || !!depositAddress}
                  />
                </div>
                
                {depositAddress ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
                      <Label className="mb-1 block">Your BTC Deposit Address</Label>
                      <p className="text-sm font-mono break-all">{depositAddress}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Send exactly {amount} BTC to this address. Your XBTC will appear in your exSat wallet after 6 confirmations.
                    </p>
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => setDepositAddress('')}
                    >
                      Generate New Address
                    </Button>
                  </div>
                ) : (
                  <Button 
                    className="w-full" 
                    type="submit" 
                    disabled={isLoading || isProcessing || !amount}
                  >
                    {isLoading || isProcessing ? "Processing..." : "Generate Deposit Address"}
                  </Button>
                )}
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
                    disabled={isLoading || isProcessing}
                  />
                </div>
                
                <div>
                  <Label htmlFor="btc-address">BTC Receive Address</Label>
                  <Input
                    id="btc-address"
                    value={btcAddress}
                    onChange={(e) => setBtcAddress(e.target.value)}
                    placeholder="bc1q..."
                    disabled={isLoading || isProcessing}
                  />
                </div>
                
                <div>
                  <Label htmlFor="gas-level">Transaction Speed</Label>
                  <div className="flex mt-1 space-x-2">
                    <Button 
                      type="button"
                      variant={gasLevel === 'slow' ? 'default' : 'outline'} 
                      size="sm"
                      className="flex-1"
                      onClick={() => setGasLevel('slow')}
                      disabled={isLoading || isProcessing}
                    >
                      Standard
                    </Button>
                    <Button 
                      type="button"
                      variant={gasLevel === 'fast' ? 'default' : 'outline'} 
                      size="sm"
                      className="flex-1"
                      onClick={() => setGasLevel('fast')}
                      disabled={isLoading || isProcessing}
                    >
                      Fast
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {gasLevel === 'fast' ? 
                      'Higher fee, faster confirmation (1-3 blocks)' : 
                      'Standard fee, normal confirmation time (3-6 blocks)'}
                  </p>
                </div>
                
                <Button 
                  className="w-full" 
                  type="submit" 
                  disabled={isLoading || isProcessing || !amount || !btcAddress}
                >
                  {isLoading || isProcessing ? "Processing..." : "Withdraw to BTC"}
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