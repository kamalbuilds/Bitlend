// We import the hardhat environment
const hre = require("hardhat");

async function main() {
  console.log("Deploying RSK TrustID contracts...");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);

  // Deploy TrustID
  const TrustID = await hre.ethers.getContractFactory("TrustID");
  const trustId = await TrustID.deploy();
  await trustId.waitForDeployment();
  const trustIdAddress = await trustId.getAddress();
  console.log(`TrustID deployed to: ${trustIdAddress}`);

  // Deploy TrustIDFactory
  const TrustIDFactory = await hre.ethers.getContractFactory("TrustIDFactory");
  const trustIdFactory = await TrustIDFactory.deploy(trustIdAddress);
  await trustIdFactory.waitForDeployment();
  console.log(`TrustIDFactory deployed to: ${await trustIdFactory.getAddress()}`);

  // Deploy CredentialRegistry
  const CredentialRegistry = await hre.ethers.getContractFactory("CredentialRegistry");
  const credentialRegistry = await CredentialRegistry.deploy(trustIdAddress);
  await credentialRegistry.waitForDeployment();
  console.log(`CredentialRegistry deployed to: ${await credentialRegistry.getAddress()}`);

  // Deploy AIReputationOracle
  const AIReputationOracle = await hre.ethers.getContractFactory("AIReputationOracle");
  const aiReputationOracle = await AIReputationOracle.deploy(trustIdAddress);
  await aiReputationOracle.waitForDeployment();
  const oracleAddress = await aiReputationOracle.getAddress();
  console.log(`AIReputationOracle deployed to: ${oracleAddress}`);

  // Grant roles
  console.log("Setting up roles...");
  
  // Grant oracle role to AIReputationOracle
  const ORACLE_ROLE = await trustId.ORACLE_ROLE();
  await trustId.grantRole(ORACLE_ROLE, oracleAddress);
  console.log(`Granted ORACLE_ROLE to ${oracleAddress}`);

  // Grant issuer role to deployer (for testing)
  const ISSUER_ROLE = await credentialRegistry.ISSUER_ROLE();
  await credentialRegistry.grantRole(ISSUER_ROLE, deployer.address);
  console.log(`Granted ISSUER_ROLE to ${deployer.address}`);

  console.log("Deployment complete!");
  
  // Return the contract addresses for verification
  return {
    trustId: trustIdAddress,
    trustIdFactory: await trustIdFactory.getAddress(),
    credentialRegistry: await credentialRegistry.getAddress(),
    aiReputationOracle: oracleAddress
  };
}

// Execute the deployment
main()
  .then((deployedAddresses) => {
    console.log("Deployment successful!");
    console.log("Contract addresses:", deployedAddresses);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 