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
      url: "https://testnet-evm.exsat.network",
      chainId: 38455, // exSat testnet chain ID
      accounts: [PRIVATE_KEY],
      gasPrice: 5000000000, // 5 gwei
    },
    exsatMainnet: {
      url: "https://evm.exsat.network",
      chainId: 38453, // exSat mainnet chain ID
      accounts: [PRIVATE_KEY],
    },
    rskTestnet: {
      url: "https://public-node.testnet.rsk.co",
      chainId: 31,
      accounts: [PRIVATE_KEY],
      gasPrice: 60000000, // 0.06 gwei
    },
    rskMainnet: {
      url: "https://public-node.rsk.co",
      chainId: 30,
      accounts: [PRIVATE_KEY],
      gasPrice: 60000000, // 0.06 gwei
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
        chainId: 38455,
        urls: {
          apiURL: "https://testnet-explorer.exsat.network/api",
          browserURL: "https://testnet-explorer.exsat.network",
        },
      },
      {
        network: "exsatMainnet",
        chainId: 38453,
        urls: {
          apiURL: "https://explorer.exsat.network/api",
          browserURL: "https://explorer.exsat.network",
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
