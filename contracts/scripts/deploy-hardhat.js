// Deploy script for BitLend protocol using Hardhat
const { ethers } = require("hardhat");
require("dotenv").config();

// exSat Network Contract Addresses - these must be set in environment variables for production deployment
// UTXO Management Contract - provides access to Bitcoin UTXO data for collateral verification
const EXSAT_UTXO_MANAGEMENT_ADDRESS = process.env.EXSAT_UTXO_MANAGEMENT_ADDRESS || "0x0000000000000000000000000000000000000000";

// Bridge Contract - handles BTC to XBTC conversions
const EXSAT_BRIDGE_ADDRESS = process.env.EXSAT_BRIDGE_ADDRESS || "0x0000000000000000000000000000000000000000";

// XBTC Token - wrapped Bitcoin token on exSat network
const XBTC_TOKEN_ADDRESS = process.env.XBTC_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";

// USDC Token - stablecoin for lending
const USDC_TOKEN_ADDRESS = process.env.USDC_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";

// Fee collector address - receives protocol fees
const FEE_COLLECTOR_ADDRESS = process.env.FEE_COLLECTOR_ADDRESS || "0x0000000000000000000000000000000000000000";

// exSat Network Configuration - used to determine if we're on testnet or mainnet
const EXSAT_NETWORK = process.env.EXSAT_NETWORK || "testnet"; // default to testnet for safety

async function main() {
  console.log(`Deploying BitLend contracts to exSat Network (${EXSAT_NETWORK})...`);

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);
  console.log(`Account balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`);

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
    
    // Initialize the mock tokens with test supply
    await mockXBTC.mint(deployer.address, ethers.parseUnits("100", 8)); // Assuming 8 decimals for XBTC
    await mockUSDC.mint(deployer.address, ethers.parseUnits("100000", 6)); // Assuming 6 decimals for USDC
    
    // Set the fee collector to the deployer if not specified
    feeCollectorAddress = deployer.address;
    
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
  const BitLendPriceOracle = await ethers.getContractFactory("BitLendPriceOracle");
  const priceOracle = await BitLendPriceOracle.deploy();
  await priceOracle.waitForDeployment();
  const priceOracleAddress = await priceOracle.getAddress();
  console.log(`BitLendPriceOracle deployed to: ${priceOracleAddress}`);

  // Deploy BitLendProofOfReserves
  console.log("Deploying BitLendProofOfReserves...");
  const BitLendProofOfReserves = await ethers.getContractFactory("BitLendProofOfReserves");
  const proofOfReserves = await BitLendProofOfReserves.deploy(
    utxoManagementAddress,
    xbtcTokenAddress,
    ethers.ZeroAddress // Will update with vault address after deployment
  );
  await proofOfReserves.waitForDeployment();
  const proofOfReservesAddress = await proofOfReserves.getAddress();
  console.log(`BitLendProofOfReserves deployed to: ${proofOfReservesAddress}`);

  // Deploy BitLendVault
  console.log("Deploying BitLendVault...");
  const BitLendVault = await ethers.getContractFactory("BitLendVault");
  const lendingVault = await BitLendVault.deploy(
    xbtcTokenAddress,
    usdcTokenAddress,
    priceOracleAddress,
    proofOfReservesAddress,
    bridgeAddress
  );
  await lendingVault.waitForDeployment();
  const vaultAddress = await lendingVault.getAddress();
  console.log(`BitLendVault deployed to: ${vaultAddress}`);

  // Update BitLendProofOfReserves with vault address
  console.log("Updating BitLendProofOfReserves with vault address...");
  await proofOfReserves.updateVaultContract(vaultAddress);
  console.log("BitLendProofOfReserves updated successfully");

  // Deploy BitLendLiquidator
  console.log("Deploying BitLendLiquidator...");
  const BitLendLiquidator = await ethers.getContractFactory("BitLendLiquidator");
  const liquidator = await BitLendLiquidator.deploy(
    vaultAddress,
    priceOracleAddress,
    xbtcTokenAddress,
    usdcTokenAddress
  );
  await liquidator.waitForDeployment();
  const liquidatorAddress = await liquidator.getAddress();
  console.log(`BitLendLiquidator deployed to: ${liquidatorAddress}`);

  // Deploy BitLendBridge
  console.log("Deploying BitLendBridge...");
  const BitLendBridge = await ethers.getContractFactory("BitLendBridge");
  const bridge = await BitLendBridge.deploy(
    xbtcTokenAddress,
    bridgeAddress,
    feeCollectorAddress
  );
  await bridge.waitForDeployment();
  const bridgeInterfaceAddress = await bridge.getAddress();
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

  // For verification on Etherscan
  console.log("Waiting for block confirmations...");
  // Wait for 5 block confirmations
  await lendingVault.deploymentTransaction().wait(5);
  console.log("Confirmed!");

  // Output verification commands
  const network = EXSAT_NETWORK === "mainnet" ? "exsatMainnet" : "exsatTestnet";
  console.log(`Verify contracts with hardhat-verify on network: ${network}`);
  console.log(`npx hardhat verify --network ${network} ${priceOracleAddress}`);
  console.log(`npx hardhat verify --network ${network} ${proofOfReservesAddress} ${utxoManagementAddress} ${xbtcTokenAddress} ${vaultAddress}`);
  console.log(`npx hardhat verify --network ${network} ${vaultAddress} ${xbtcTokenAddress} ${usdcTokenAddress} ${priceOracleAddress} ${proofOfReservesAddress} ${bridgeAddress}`);
  console.log(`npx hardhat verify --network ${network} ${liquidatorAddress} ${vaultAddress} ${priceOracleAddress} ${xbtcTokenAddress} ${usdcTokenAddress}`);
  console.log(`npx hardhat verify --network ${network} ${bridgeInterfaceAddress} ${xbtcTokenAddress} ${bridgeAddress} ${feeCollectorAddress}`);
}

// Execute the deployment function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 