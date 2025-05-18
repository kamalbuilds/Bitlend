const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("TrustID System", function () {
  let trustId;
  let trustIdFactory;
  let aiReputationOracle;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy TrustID
    const TrustID = await ethers.getContractFactory("TrustID");
    trustId = await TrustID.deploy();
    await trustId.waitForDeployment();

    // Deploy TrustIDFactory
    const TrustIDFactory = await ethers.getContractFactory("TrustIDFactory");
    trustIdFactory = await TrustIDFactory.deploy(await trustId.getAddress());
    await trustIdFactory.waitForDeployment();

    // Deploy AIReputationOracle
    const AIReputationOracle = await ethers.getContractFactory("AIReputationOracle");
    aiReputationOracle = await AIReputationOracle.deploy(await trustId.getAddress());
    await aiReputationOracle.waitForDeployment();

    // Grant oracle role to AIReputationOracle
    const ORACLE_ROLE = await trustId.ORACLE_ROLE();
    await trustId.grantRole(ORACLE_ROLE, await aiReputationOracle.getAddress());
  });

  describe("Identity Management", function () {
    it("Should create an identity through factory", async function () {
      // Create an identity
      const username = "alice";
      const metadataURI = "data:application/json,{\"fullName\":\"Alice Smith\",\"bio\":\"Blockchain enthusiast\"}";
      
      await trustIdFactory.connect(user1).createIdentity(username, metadataURI);
      
      // Check if the identity was created
      const did = "did:rsk:" + username;
      const identity = await trustId.getIdentity(did);
      
      expect(identity[0]).to.equal(user1.address); // owner
      expect(identity[1]).to.equal(metadataURI); // metadataURI
      expect(identity[4]).to.equal(true); // active
    });

    it("Should prevent creating duplicate identities", async function () {
      // Create first identity
      const username = "bob";
      const metadataURI = "data:application/json,{\"fullName\":\"Bob Johnson\"}";
      
      await trustIdFactory.connect(user1).createIdentity(username, metadataURI);
      
      // Try to create a duplicate
      await expect(
        trustIdFactory.connect(user2).createIdentity(username, metadataURI)
      ).to.be.revertedWith("DID already registered");
    });

    it("Should update identity metadata", async function () {
      // Create an identity
      const username = "charlie";
      const metadataURI = "data:application/json,{\"fullName\":\"Charlie Brown\"}";
      
      await trustIdFactory.connect(user1).createIdentity(username, metadataURI);
      
      // Update the metadata
      const did = "did:rsk:" + username;
      const newMetadataURI = "data:application/json,{\"fullName\":\"Charlie Brown\",\"bio\":\"Updated bio\"}";
      
      await trustId.connect(user1).updateIdentity(did, newMetadataURI);
      
      // Check if the metadata was updated
      const identity = await trustId.getIdentity(did);
      expect(identity[1]).to.equal(newMetadataURI);
    });

    it("Should prevent unauthorized metadata updates", async function () {
      // Create an identity
      const username = "david";
      const metadataURI = "data:application/json,{\"fullName\":\"David Miller\"}";
      
      await trustIdFactory.connect(user1).createIdentity(username, metadataURI);
      
      // Try to update the metadata as a different user
      const did = "did:rsk:" + username;
      const newMetadataURI = "data:application/json,{\"fullName\":\"Hacked Name\"}";
      
      await expect(
        trustId.connect(user2).updateIdentity(did, newMetadataURI)
      ).to.be.revertedWith("Not the identity owner");
    });
  });

  describe("Reputation System", function () {
    it("Should update reputation scores through oracle", async function () {
      // Create an identity
      const username = "eve";
      const metadataURI = "data:application/json,{\"fullName\":\"Eve Anderson\"}";
      
      await trustIdFactory.connect(user1).createIdentity(username, metadataURI);
      const did = "did:rsk:" + username;
      
      // Update reputation through oracle
      const newScore = 800;
      const categories = ["finance", "social"];
      const categoryScores = [850, 750];
      
      await aiReputationOracle.connect(owner).updateReputation(did, newScore, categories, categoryScores);
      
      // Check if the overall reputation was updated
      const [score, lastUpdated] = await trustId.getReputation(did);
      expect(score).to.equal(newScore);
      
      // Check if the category scores were updated
      const financeScore = await trustId.getCategoryReputation(did, "finance");
      const socialScore = await trustId.getCategoryReputation(did, "social");
      
      expect(financeScore).to.equal(850);
      expect(socialScore).to.equal(750);
    });

    it("Should prevent unauthorized reputation updates", async function () {
      // Create an identity
      const username = "frank";
      const metadataURI = "data:application/json,{\"fullName\":\"Frank Wilson\"}";
      
      await trustIdFactory.connect(user1).createIdentity(username, metadataURI);
      const did = "did:rsk:" + username;
      
      // Try to update reputation directly (bypassing oracle)
      await expect(
        trustId.connect(user2).updateReputation(did, 800, "finance", 850)
      ).to.be.reverted; // Missing role check
    });

    it("Should request a reputation update", async function () {
      // Create an identity
      const username = "grace";
      const metadataURI = "data:application/json,{\"fullName\":\"Grace Taylor\"}";
      
      await trustIdFactory.connect(user1).createIdentity(username, metadataURI);
      const did = "did:rsk:" + username;
      
      // Request reputation update
      await expect(
        aiReputationOracle.connect(user1).requestReputationUpdate(did)
      ).to.emit(aiReputationOracle, "ReputationUpdateRequested")
        .withArgs(did, user1.address);
    });
  });
}); 