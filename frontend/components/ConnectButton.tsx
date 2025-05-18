"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';

interface ConnectButtonProps {
  setConnected: (connected: boolean) => void;
  setAddress: (address: string) => void;
}

export const ConnectButton = ({ setConnected, setAddress }: ConnectButtonProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const { address, isConnected } = useAccount();
  const { connect } = useConnect({
    connector: new InjectedConnector(),
  });
  const { disconnect } = useDisconnect();

  // Update parent state when connection status changes
  useState(() => {
    if (isConnected && address) {
      setConnected(true);
      setAddress(address);
    } else {
      setConnected(false);
      setAddress('');
    }
  });

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await connect();
    } catch (error) {
      console.error("Connection error:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setConnected(false);
      setAddress('');
    } catch (error) {
      console.error("Disconnection error:", error);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-sm text-gray-700 dark:text-gray-300 hidden md:block">
          {formatAddress(address)}
        </div>
        <Button
          variant="outline"
          className="border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300"
          onClick={handleDisconnect}
        >
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button 
      onClick={handleConnect}
      disabled={isConnecting}
      className="bg-indigo-600 hover:bg-indigo-700 text-white"
    >
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}; 