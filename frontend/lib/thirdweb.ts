import { createThirdwebClient, ChainId } from "@thirdweb-dev/sdk";
import { RSK, RSKTestnet } from "@thirdweb-dev/chains";
import { ConnectWallet, ThirdwebProvider } from "@thirdweb-dev/react";

// Define the client ID (get this from thirdweb dashboard)
export const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "";

// Create the client instance
export const client = createThirdwebClient({
  clientId,
  // You can add more configurations here
});

// Export supported chains
export const supportedChains = [RSK, RSKTestnet];

// Helper to determine if we're on testnet or mainnet
export const getActiveChain = (chainId?: number) => {
  if (!chainId) return RSKTestnet;
  
  return chainId === 30 ? RSK : RSKTestnet;
}; 