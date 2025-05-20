"use client";

import { useState, useEffect } from 'react';
import { 
  useActiveAccount, 
  useReadContract, 
  useSendTransaction 
} from "thirdweb/react";
import { getContract, prepareContractCall, defineChain } from "thirdweb";
import { Card, CardContent, CardTitle, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { parseUnits, formatUnits } from "ethers";
import { client } from "@/lib/client";

// Define exSat chain
const exSatChain = defineChain({
  id: 7200,
  name: "exSat Network",
  rpc: "https://evm.exsat.network/",
  nativeCurrency: {
    name: "BTC",
    symbol: "BTC",
    decimals: 18,
  },
  blockExplorers: [
    {
      name: "exSat Explorer",
      url: "https://scan.exsat.network/",
    },
  ],
});

interface ExampleComponentProps {
  tokenAddress: string;
}

export default function ExampleComponent({ tokenAddress }: ExampleComponentProps) {
  const [tokenBalance, setTokenBalance] = useState('0');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const { toast } = useToast();
  const account = useActiveAccount();
  
  // Initialize contract
  const contract = getContract({
    client,
    address: tokenAddress,
    chain: exSatChain,
  });
  
  // Get token balance
  const { data, isLoading } = useReadContract({
    contract,
    method: "function balanceOf(address) returns (uint256)",
    params: account?.address ? [account.address] : undefined,
    enabled: !!account?.address,
  });
  
  // Setup token transfer function
  const { mutateAsync: sendTransaction, isPending } = useSendTransaction();
  
  useEffect(() => {
    if (data) {
      // Convert the balance to a readable format
      setTokenBalance(formatUnits(data.toString(), 8)); // Assuming 8 decimals for the token
    }
  }, [data]);
  
  const handleTransfer = async () => {
    if (!amount || !recipientAddress || !account?.address) {
      toast({
        title: "Error",
        description: "Please enter a valid amount and recipient address",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Prepare the transaction
      const transaction = prepareContractCall({
        contract,
        method: "function transfer(address,uint256) returns (bool)",
        params: [recipientAddress, parseUnits(amount, 8)], // Assuming 8 decimals
      });
      
      // Send the transaction
      await sendTransaction(transaction);
      
      toast({
        title: "Transfer successful",
        description: `Successfully transferred ${amount} tokens to ${recipientAddress}`,
      });
      
      // Clear inputs
      setAmount('');
      setRecipientAddress('');
      
    } catch (error) {
      console.error("Transfer error:", error);
      toast({
        title: "Transfer failed",
        description: "There was an error transferring your tokens",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Token Transfer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Your Balance</Label>
            <p className="text-lg font-medium">{isLoading ? "Loading..." : `${tokenBalance} Tokens`}</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              placeholder="0x..."
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              disabled={isPending}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              placeholder="0.0"
              type="number"
              step="0.00000001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isPending}
            />
          </div>
          
          <Button 
            className="w-full"
            onClick={handleTransfer}
            disabled={isPending || !amount || !recipientAddress || Number(amount) <= 0 || Number(amount) > Number(tokenBalance)}
          >
            {isPending ? "Processing..." : "Transfer Tokens"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 