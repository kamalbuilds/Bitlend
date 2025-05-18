// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require("hardhat");
require("dotenv").config();

// exSat Network Contract Addresses - these must be set in environment variables for production deployment
// UTXO Management Contract - provides access to Bitcoin UTXO data for collateral verification
const EXSAT_UTXO_MANAGEMENT_ADDRESS = process.env.EXSAT_UTXO_MANAGEMENT_ADDRESS || "0x0000000000000000000000000000000000000000";

// Bridge Contract - handles BTC to XBTC conversions
const EXSAT_BRIDGE_ADDRESS = process.env.EXSAT_BRIDGE_ADDRESS || "0x0000000000000000000000000000000000000000";

// Custody Contract - (if needed by implementation)
const EXSAT_CUSTODY_ADDRESS = process.env.EXSAT_CUSTODY_ADDRESS || "0x0000000000000000000000000000000000000000";

// XBTC Token - wrapped Bitcoin token on exSat network
const XBTC_TOKEN_ADDRESS = process.env.XBTC_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";

// USDC Token - stablecoin for lending
const USDC_TOKEN_ADDRESS = process.env.USDC_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";

// Rebar Data Integration - for Bitcoin price feeds and analytics
const REBAR_DATA_ORACLE_ADDRESS = process.env.REBAR_DATA_ORACLE_ADDRESS || "0x0000000000000000000000000000000000000000";

// Rebar Shield - for MEV protection on liquidations
const REBAR_SHIELD_ADDRESS = process.env.REBAR_SHIELD_ADDRESS || "0x0000000000000000000000000000000000000000";

// Fee collector address - receives protocol fees
const FEE_COLLECTOR_ADDRESS = process.env.FEE_COLLECTOR_ADDRESS || "0x0000000000000000000000000000000000000000";

// exSat Network Configuration - used to determine if we're on testnet or mainnet
const EXSAT_NETWORK = process.env.EXSAT_NETWORK || "testnet"; // default to testnet for safety

async function main() {
  console.log(`Deploying BitLend contracts to exSat Network (${EXSAT_NETWORK})...`);

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);

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
  let rebarDataOracleAddress = REBAR_DATA_ORACLE_ADDRESS;
  let rebarShieldAddress = REBAR_SHIELD_ADDRESS;
  let feeCollectorAddress = FEE_COLLECTOR_ADDRESS || deployer.address;
  
  // Deploy mock contracts if needed
  if (useMocks) {
    console.log("Deploying mock contracts for testing...");
    
    // Deploy MockUTXOManagement
    console.log("Deploying MockUTXOManagement...");
    const MockUTXOManagement = await ethers.getContractFactory("MockUTXOManagement");
    const mockUTXO = await MockUTXOManagement.deploy();
    await mockUTXO.waitForDeployment();
    utxoManagementAddress = await mockUTXO.getAddress();
    console.log(`MockUTXOManagement deployed to: ${utxoManagementAddress}`);
    
    // Deploy MockBridge
    console.log("Deploying MockExSatBridge...");
    const MockExSatBridge = await ethers.getContractFactory("MockExSatBridge");
    const mockBridge = await MockExSatBridge.deploy();
    await mockBridge.waitForDeployment();
    bridgeAddress = await mockBridge.getAddress();
    console.log(`MockExSatBridge deployed to: ${bridgeAddress}`);
    
    // Deploy MockXBTC
    console.log("Deploying MockXBTC...");
    const MockXBTC = await ethers.getContractFactory("MockXBTC");
    const mockXBTC = await MockXBTC.deploy();
    await mockXBTC.waitForDeployment();
    xbtcTokenAddress = await mockXBTC.getAddress();
    console.log(`MockXBTC deployed to: ${xbtcTokenAddress}`);
    
    // Deploy MockUSDC
    console.log("Deploying MockUSDC...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    usdcTokenAddress = await mockUSDC.getAddress();
    console.log(`MockUSDC deployed to: ${usdcTokenAddress}`);
    
    // Deploy MockRebarDataOracle
    console.log("Deploying MockRebarDataOracle...");
    const MockRebarDataOracle = await ethers.getContractFactory("MockRebarDataOracle");
    const mockDataOracle = await MockRebarDataOracle.deploy();
    await mockDataOracle.waitForDeployment();
    rebarDataOracleAddress = await mockDataOracle.getAddress();
    console.log(`MockRebarDataOracle deployed to: ${rebarDataOracleAddress}`);
    
    // Deploy MockRebarShield
    console.log("Deploying MockRebarShield...");
    const MockRebarShield = await ethers.getContractFactory("MockRebarShieldConnector");
    const mockShield = await MockRebarShield.deploy();
    await mockShield.waitForDeployment();
    rebarShieldAddress = await mockShield.getAddress();
    console.log(`MockRebarShield deployed to: ${rebarShieldAddress}`);
    
    // Initialize the mock tokens with test supply
    await mockXBTC.mint(deployer.address, ethers.parseEther("100"));
    await mockUSDC.mint(deployer.address, ethers.parseUnits("100000", 6));
    
    // Set the fee collector to the deployer if not specified
    feeCollectorAddress = deployer.address;
    
    console.log("Mock contracts deployed and initialized for testing.");
  } else {
    console.log("Using real exSat Network contracts:");
    console.log(`- UTXO Management: ${utxoManagementAddress}`);
    console.log(`- exSat Bridge: ${bridgeAddress}`);
    console.log(`- XBTC Token: ${xbtcTokenAddress}`);
    console.log(`- USDC Token: ${usdcTokenAddress}`);
    console.log(`- Rebar Data Oracle: ${rebarDataOracleAddress}`);
    console.log(`- Rebar Shield: ${rebarShieldAddress}`);
    console.log(`- Fee Collector: ${feeCollectorAddress}`);
  }

  // Deploy BitLendPriceOracle
  console.log("Deploying BitLendPriceOracle...");
  const BitLendPriceOracle = await ethers.getContractFactory("BitLendPriceOracle");
  const priceOracle = await BitLendPriceOracle.deploy(rebarDataOracleAddress);
  await priceOracle.waitForDeployment();
  console.log(`BitLendPriceOracle deployed to: ${await priceOracle.getAddress()}`);

  // Deploy BitLendProofOfReserves
  console.log("Deploying BitLendProofOfReserves...");
  const BitLendProofOfReserves = await ethers.getContractFactory("BitLendProofOfReserves");
  const proofOfReserves = await BitLendProofOfReserves.deploy(
    utxoManagementAddress,
    xbtcTokenAddress,
    ethers.ZeroAddress // Will update with vault address after deployment
  );
  await proofOfReserves.waitForDeployment();
  console.log(`BitLendProofOfReserves deployed to: ${await proofOfReserves.getAddress()}`);

  // Deploy BitLendVault
  console.log("Deploying BitLendVault...");
  const BitLendVault = await ethers.getContractFactory("BitLendVault");
  const lendingVault = await BitLendVault.deploy(
    xbtcTokenAddress,
    usdcTokenAddress,
    await priceOracle.getAddress(),
    await proofOfReserves.getAddress(),
    bridgeAddress
  );
  await lendingVault.waitForDeployment();
  console.log(`BitLendVault deployed to: ${await lendingVault.getAddress()}`);

  // Update BitLendProofOfReserves with vault address
  console.log("Updating BitLendProofOfReserves with vault address...");
  await proofOfReserves.updateVaultContract(await lendingVault.getAddress());

  // Deploy BitLendLiquidator
  console.log("Deploying BitLendLiquidator...");
  const BitLendLiquidator = await ethers.getContractFactory("BitLendLiquidator");
  const liquidator = await BitLendLiquidator.deploy(
    await lendingVault.getAddress(),
    await priceOracle.getAddress(),
    xbtcTokenAddress,
    usdcTokenAddress,
    rebarShieldAddress
  );
  await liquidator.waitForDeployment();
  console.log(`BitLendLiquidator deployed to: ${await liquidator.getAddress()}`);

  // Deploy BitLendBridge
  console.log("Deploying BitLendBridge...");
  const BitLendBridge = await ethers.getContractFactory("BitLendBridge");
  const bridge = await BitLendBridge.deploy(
    xbtcTokenAddress,
    bridgeAddress,
    feeCollectorAddress
  );
  await bridge.waitForDeployment();
  console.log(`BitLendBridge deployed to: ${await bridge.getAddress()}`);

  console.log("----------------------------------------------------");
  console.log("Deployment complete!");
  console.log("----------------------------------------------------");
  console.log("Deployed contract addresses:");
  console.log(`- BitLendPriceOracle: ${await priceOracle.getAddress()}`);
  console.log(`- BitLendProofOfReserves: ${await proofOfReserves.getAddress()}`);
  console.log(`- BitLendVault: ${await lendingVault.getAddress()}`);
  console.log(`- BitLendLiquidator: ${await liquidator.getAddress()}`);
  console.log(`- BitLendBridge: ${await bridge.getAddress()}`);
  console.log("----------------------------------------------------");

  // For verification on Etherscan
  console.log("Waiting for block confirmations...");
  // Wait for 5 block confirmations
  await lendingVault.deploymentTransaction().wait(5);
  console.log("Confirmed!");

  // Output verification commands
  console.log("Verify contracts with:");
  console.log(`npx hardhat verify --network exsat-${EXSAT_NETWORK} ${await priceOracle.getAddress()} ${rebarDataOracleAddress}`);
  console.log(`npx hardhat verify --network exsat-${EXSAT_NETWORK} ${await proofOfReserves.getAddress()} ${utxoManagementAddress} ${xbtcTokenAddress} ${await lendingVault.getAddress()}`);
  console.log(`npx hardhat verify --network exsat-${EXSAT_NETWORK} ${await lendingVault.getAddress()} ${xbtcTokenAddress} ${usdcTokenAddress} ${await priceOracle.getAddress()} ${await proofOfReserves.getAddress()} ${bridgeAddress}`);
  console.log(`npx hardhat verify --network exsat-${EXSAT_NETWORK} ${await liquidator.getAddress()} ${await lendingVault.getAddress()} ${await priceOracle.getAddress()} ${xbtcTokenAddress} ${usdcTokenAddress} ${rebarShieldAddress}`);
  console.log(`npx hardhat verify --network exsat-${EXSAT_NETWORK} ${await bridge.getAddress()} ${xbtcTokenAddress} ${bridgeAddress} ${feeCollectorAddress}`);
  
  // Save the deployment information to a file
  const fs = require('fs');
  const deploymentInfo = {
    network: EXSAT_NETWORK,
    timestamp: new Date().toISOString(),
    contracts: {
      BitLendPriceOracle: await priceOracle.getAddress(),
      BitLendProofOfReserves: await proofOfReserves.getAddress(),
      BitLendVault: await lendingVault.getAddress(),
      BitLendLiquidator: await liquidator.getAddress(),
      BitLendBridge: await bridge.getAddress()
    },
    externalContracts: {
      UTXOManagement: utxoManagementAddress,
      ExSatBridge: bridgeAddress,
      XBTCToken: xbtcTokenAddress,
      USDCToken: usdcTokenAddress,
      RebarDataOracle: rebarDataOracleAddress,
      RebarShield: rebarShieldAddress
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