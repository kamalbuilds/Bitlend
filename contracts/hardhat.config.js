require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    hardhat: {
      chainId: 31337,
    },
    // exSat Network configuration
    exsatTestnet: {
      url: "https://evm-tst3.exsat.network",
      chainId: 7300, // exSat testnet chain ID (updated to match frontend)
      accounts: [PRIVATE_KEY],
      gasPrice: 5000000000, // 5 gwei
    },
    exsatMainnet: {
      url: "https://evm.exsat.network",
      chainId: 7200, // exSat mainnet chain ID (updated to match frontend)
      accounts: [PRIVATE_KEY],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  etherscan: {
    apiKey: {
      rskTestnet: "not-needed",
      rskMainnet: "not-needed",
      exsatTestnet: "not-needed",
      exsatMainnet: "not-needed",
    },
    customChains: [
      {
        network: "exsatTestnet",
        chainId: 7300, // Updated to match frontend
        urls: {
          apiURL: "https://scan-testnet.exsat.network/api", // Updated to match frontend
          browserURL: "https://scan-testnet.exsat.network", // Updated to match frontend
        },
      },
      {
        network: "exsatMainnet",
        chainId: 7200, // Updated to match frontend
        urls: {
          apiURL: "https://scan.exsat.network/api", // Updated to match frontend
          browserURL: "https://scan.exsat.network", // Updated to match frontend
        },
      },
      {
        network: "rskTestnet",
        chainId: 31,
        urls: {
          apiURL: "https://blockscout.com/rsk/testnet/api",
          browserURL: "https://blockscout.com/rsk/testnet",
        },
      },
      {
        network: "rskMainnet",
        chainId: 30,
        urls: {
          apiURL: "https://blockscout.com/rsk/mainnet/api",
          browserURL: "https://blockscout.com/rsk/mainnet",
        },
      },
    ],
  },
};
