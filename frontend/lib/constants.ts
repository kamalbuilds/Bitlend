// Rootstock chain definitions
export const RSK_MAINNET = {
  id: 30,
  name: "Rootstock Mainnet",
  nativeCurrency: {
    name: "RBTC",
    symbol: "RBTC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://mainnet.rsk.co"],
    },
    public: {
      http: ["https://mainnet.rsk.co"],
    },
  },
  blockExplorers: {
    default: {
      name: "RSK Explorer",
      url: "https://explorer.rsk.co",
    },
  },
  testnet: false,
};

export const RSK_TESTNET = {
  id: 31,
  name: "Rootstock Testnet",
  nativeCurrency: {
    name: "tRBTC",
    symbol: "tRBTC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://testnet.rsk.co"],
    },
    public: {
      http: ["https://testnet.rsk.co"],
    },
  },
  blockExplorers: {
    default: {
      name: "RSK Testnet Explorer",
      url: "https://explorer.testnet.rsk.co",
    },
  },
  testnet: true,
}; 