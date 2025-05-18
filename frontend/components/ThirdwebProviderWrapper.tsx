import { ThirdwebProvider } from "@thirdweb-dev/react";
import { ReactNode } from "react";

// Rootstock chain IDs
const ROOTSTOCK_MAINNET = {
  chainId: 30,
  name: "Rootstock Mainnet",
  symbol: "RBTC",
  rpcUrls: ["https://mainnet.rsk.co"],
  blockExplorerUrls: ["https://explorer.rsk.co"],
};

const ROOTSTOCK_TESTNET = {
  chainId: 31,
  name: "Rootstock Testnet",
  symbol: "tRBTC",
  rpcUrls: ["https://testnet.rsk.co"],
  blockExplorerUrls: ["https://explorer.testnet.rsk.co"],
};

interface ThirdwebProviderWrapperProps {
  children: ReactNode;
}

export default function ThirdwebProviderWrapper({ children }: ThirdwebProviderWrapperProps) {
  return (
    <ThirdwebProvider
      clientId={process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID}
      activeChain={ROOTSTOCK_TESTNET}
      dAppMeta={{
        name: "RSK TrustID",
        description: "Self-sovereign identity and reputation system built on Rootstock blockchain",
        logoUrl: "/logo.png",
        url: "https://trustid.rsk.co",
      }}
      autoConnect={true}
      // Enable various wallet connectors
      walletConnectors={[
        "metamask",
        "coinbase",
        "walletConnect",
        {
          name: "walletConnect",
          options: {
            projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
          }
        }
      ]}
    >
      {children}
    </ThirdwebProvider>
  );
} 