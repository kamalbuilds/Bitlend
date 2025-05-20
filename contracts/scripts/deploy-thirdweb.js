// Deploy script for BitLend protocol using thirdweb v5
const { createThirdwebClient } = require("thirdweb");
const { deployContract } = require("thirdweb/deploy");
const { privateKeyAccount } = require("thirdweb/wallets");
const { defineChain } = require("thirdweb");
const { ethers } = require("ethers");
require("dotenv").config();

// Load environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CLIENT_ID = process.env.THIRDWEB_CLIENT_ID;
const EXSAT_NETWORK = process.env.EXSAT_NETWORK || "testnet"; // Default to testnet for safety

// exSat Network Contract Addresses
const EXSAT_UTXO_MANAGEMENT_ADDRESS = process.env.EXSAT_UTXO_MANAGEMENT_ADDRESS || "0x0000000000000000000000000000000000000000";
const EXSAT_BRIDGE_ADDRESS = process.env.EXSAT_BRIDGE_ADDRESS || "0x0000000000000000000000000000000000000000";
const EXSAT_CUSTODY_ADDRESS = process.env.EXSAT_CUSTODY_ADDRESS || "0x0000000000000000000000000000000000000000";
const XBTC_TOKEN_ADDRESS = process.env.XBTC_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";
const USDC_TOKEN_ADDRESS = process.env.USDC_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";
const FEE_COLLECTOR_ADDRESS = process.env.FEE_COLLECTOR_ADDRESS || "0x0000000000000000000000000000000000000000";

// Define exSat chains
const exSatMainnet = defineChain({
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

const exSatTestnet = defineChain({
  id: 7300,
  name: "exSat Testnet",
  rpc: "https://evm-tst3.exsat.network/",
  nativeCurrency: {
    name: "BTC",
    symbol: "BTC",
    decimals: 18,
  },
  blockExplorers: [
    {
      name: "exSat Testnet Explorer",
      url: "https://scan-testnet.exsat.network/",
    },
  ],
});

// Choose the appropriate chain
const chain = EXSAT_NETWORK === "mainnet" ? exSatMainnet : exSatTestnet;

// Load contract artifacts
const BitLendPriceOracleArtifact = require("../artifacts/contracts/BitLendPriceOracle.sol/BitLendPriceOracle.json");
const BitLendProofOfReservesArtifact = require("../artifacts/contracts/BitLendProofOfReserves.sol/BitLendProofOfReserves.json");
const BitLendVaultArtifact = require("../artifacts/contracts/BitLendVault.sol/BitLendVault.json");
const BitLendLiquidatorArtifact = require("../artifacts/contracts/BitLendLiquidator.sol/BitLendLiquidator.json");
const BitLendBridgeArtifact = require("../artifacts/contracts/BitLendBridge.sol/BitLendBridge.json");

// Mock contracts for development/testing
const MockUTXOManagementArtifact = require("../artifacts/contracts/mocks/MockUTXOManagement.sol/MockUTXOManagement.json");
const MockExSatBridgeArtifact = require("../artifacts/contracts/mocks/MockExSatBridge.sol/MockExSatBridge.json");
const MockXBTCArtifact = require("../artifacts/contracts/mocks/MockXBTC.sol/MockXBTC.json");
const MockUSDCArtifact = require("../artifacts/contracts/mocks/MockUSDC.sol/MockUSDC.json");

async function main() {
  console.log(`Deploying BitLend contracts to exSat Network (${EXSAT_NETWORK})...`);

  if (!PRIVATE_KEY) {
    throw new Error("Missing PRIVATE_KEY environment variable");
  }

  if (!CLIENT_ID) {
    throw new Error("Missing THIRDWEB_CLIENT_ID environment variable");
  }

  // Initialize thirdweb client
  const client = createThirdwebClient({ clientId: CLIENT_ID });

  // Create wallet instance from private key
  const account = privateKeyAccount({
    client,
    privateKey: PRIVATE_KEY,
    chain,
  });

  console.log(`Deploying contracts with the account: ${account.address}`);

  // Check critical environment variables
  let useMocks = false;
  
  // If we're in development mode or missing critical addresses, we'll use mocks
  if (EXSAT_NETWORK === "development" || 
      EXSAT_UTXO_MANAGEMENT_ADDRESS === "0x0000000000000000000000000000000000000000" ||
      EXSAT_BRIDGE_ADDRESS === "0x0000000000000000000000000000000000000000" ||
      XBTC_TOKEN_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.warn("WARNING: Missing critical exSat addresses or in development mode.");
    console.warn("Using mock contracts for testing. DO NOT USE IN PRODUCTION!");
    useMocks = true;
  }

  // Set up addresses based on whether we're using mocks or real contracts
  let utxoManagementAddress = EXSAT_UTXO_MANAGEMENT_ADDRESS;
  let bridgeAddress = EXSAT_BRIDGE_ADDRESS;
  let xbtcTokenAddress = XBTC_TOKEN_ADDRESS;
  let usdcTokenAddress = USDC_TOKEN_ADDRESS;
  let feeCollectorAddress = FEE_COLLECTOR_ADDRESS || account.address;
  
  // Deploy mock contracts if needed
  if (useMocks) {
    console.log("Deploying mock contracts for testing...");
    
    // Deploy MockUTXOManagement
    console.log("Deploying MockUTXOManagement...");
    const mockUTXOAddress = await deployContract({
      client,
      chain,
      account,
      abi: MockUTXOManagementArtifact.abi,
      bytecode: MockUTXOManagementArtifact.bytecode,
    });
    utxoManagementAddress = mockUTXOAddress;
    console.log(`MockUTXOManagement deployed to: ${utxoManagementAddress}`);
    
    // Deploy MockBridge
    console.log("Deploying MockExSatBridge...");
    const mockBridgeAddress = await deployContract({
      client,
      chain,
      account,
      abi: MockExSatBridgeArtifact.abi,
      bytecode: MockExSatBridgeArtifact.bytecode,
    });
    bridgeAddress = mockBridgeAddress;
    console.log(`MockExSatBridge deployed to: ${bridgeAddress}`);
    
    // Deploy MockXBTC
    console.log("Deploying MockXBTC...");
    const mockXBTCAddress = await deployContract({
      client,
      chain,
      account,
      abi: MockXBTCArtifact.abi,
      bytecode: MockXBTCArtifact.bytecode,
    });
    xbtcTokenAddress = mockXBTCAddress;
    console.log(`MockXBTC deployed to: ${xbtcTokenAddress}`);
    
    // Deploy MockUSDC
    console.log("Deploying MockUSDC...");
    const mockUSDCAddress = await deployContract({
      client,
      chain,
      account,
      abi: MockUSDCArtifact.abi,
      bytecode: MockUSDCArtifact.bytecode,
    });
    usdcTokenAddress = mockUSDCAddress;
    console.log(`MockUSDC deployed to: ${usdcTokenAddress}`);
    
    // Initialize the mock tokens with test supply
    // Note: Additional steps would be needed to interact with these contracts after deployment
    
    // Set the fee collector to the deployer if not specified
    feeCollectorAddress = account.address;
    
    console.log("Mock contracts deployed and initialized for testing.");
  } else {
    console.log("Using real exSat Network contracts:");
    console.log(`- UTXO Management: ${utxoManagementAddress}`);
    console.log(`- exSat Bridge: ${bridgeAddress}`);
    console.log(`- XBTC Token: ${xbtcTokenAddress}`);
    console.log(`- USDC Token: ${usdcTokenAddress}`);
    console.log(`- Fee Collector: ${feeCollectorAddress}`);
  }

  // Deploy BitLendPriceOracle
  console.log("Deploying BitLendPriceOracle...");
  const priceOracleAddress = await deployContract({
    client,
    chain,
    account,
    abi: BitLendPriceOracleArtifact.abi,
    bytecode: BitLendPriceOracleArtifact.bytecode,
  });
  console.log(`BitLendPriceOracle deployed to: ${priceOracleAddress}`);

  // Deploy BitLendProofOfReserves with initial parameters
  console.log("Deploying BitLendProofOfReserves...");
  const proofOfReservesAddress = await deployContract({
    client,
    chain,
    account,
    abi: BitLendProofOfReservesArtifact.abi,
    bytecode: BitLendProofOfReservesArtifact.bytecode,
    constructorParams: {
      _utxoManagement: utxoManagementAddress,
      _xbtcToken: xbtcTokenAddress,
      _vaultContract: "0x0000000000000000000000000000000000000000" // Will update after vault deployment
    },
  });
  console.log(`BitLendProofOfReserves deployed to: ${proofOfReservesAddress}`);

  // Deploy BitLendVault
  console.log("Deploying BitLendVault...");
  const vaultAddress = await deployContract({
    client,
    chain,
    account,
    abi: BitLendVaultArtifact.abi,
    bytecode: BitLendVaultArtifact.bytecode,
    constructorParams: {
      _xbtcToken: xbtcTokenAddress,
      _stablecoin: usdcTokenAddress,
      _priceOracle: priceOracleAddress,
      _proofOfReserves: proofOfReservesAddress,
      _bridge: bridgeAddress
    },
  });
  console.log(`BitLendVault deployed to: ${vaultAddress}`);

  // Update BitLendProofOfReserves with vault address
  // Note: Additional steps would be needed to interact with these contracts after deployment
  console.log("Note: You need to update BitLendProofOfReserves with vault address using a separate transaction");

  // Deploy BitLendLiquidator
  console.log("Deploying BitLendLiquidator...");
  const liquidatorAddress = await deployContract({
    client,
    chain,
    account,
    abi: BitLendLiquidatorArtifact.abi,
    bytecode: BitLendLiquidatorArtifact.bytecode,
    constructorParams: {
      _lendingVault: vaultAddress,
      _priceOracle: priceOracleAddress,
      _xbtcToken: xbtcTokenAddress,
      _stablecoin: usdcTokenAddress
    },
  });
  console.log(`BitLendLiquidator deployed to: ${liquidatorAddress}`);

  // Deploy BitLendBridge
  console.log("Deploying BitLendBridge...");
  const bridgeInterfaceAddress = await deployContract({
    client,
    chain,
    account,
    abi: BitLendBridgeArtifact.abi,
    bytecode: BitLendBridgeArtifact.bytecode,
    constructorParams: {
      _xbtcToken: xbtcTokenAddress,
      _exsatBridge: bridgeAddress,
      _feeCollector: feeCollectorAddress
    },
  });
  console.log(`BitLendBridge deployed to: ${bridgeInterfaceAddress}`);

  console.log("----------------------------------------------------");
  console.log("Deployment complete!");
  console.log("----------------------------------------------------");
  console.log("Deployed contract addresses:");
  console.log(`- BitLendPriceOracle: ${priceOracleAddress}`);
  console.log(`- BitLendProofOfReserves: ${proofOfReservesAddress}`);
  console.log(`- BitLendVault: ${vaultAddress}`);
  console.log(`- BitLendLiquidator: ${liquidatorAddress}`);
  console.log(`- BitLendBridge: ${bridgeInterfaceAddress}`);
  console.log("----------------------------------------------------");

  // Save the deployment information to a file
  const fs = require('fs');
  const deploymentInfo = {
    network: EXSAT_NETWORK,
    timestamp: new Date().toISOString(),
    contracts: {
      BitLendPriceOracle: priceOracleAddress,
      BitLendProofOfReserves: proofOfReservesAddress,
      BitLendVault: vaultAddress,
      BitLendLiquidator: liquidatorAddress,
      BitLendBridge: bridgeInterfaceAddress
    },
    externalContracts: {
      UTXOManagement: utxoManagementAddress,
      ExSatBridge: bridgeAddress,
      XBTCToken: xbtcTokenAddress,
      USDCToken: usdcTokenAddress
    },
    usedMocks: useMocks
  };
  
  fs.writeFileSync('./deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("Deployment information saved to deployment-info.json");
}

// Execute the deployment function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 