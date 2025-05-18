import { ethers } from 'ethers';
import contracts from "@/config/contracts";

// Mock ABIs until actual ones are available
const IdentityRegistryABI = [
  "function createIdentity(string memory uri) external returns (uint256)",
  "function getIdentity(uint256 id) external view returns (address owner, string memory uri, uint256 timestamp)",
  "function updateMetadata(uint256 id, string memory newUri) external",
  "function identityExists(uint256 id) external view returns (bool)",
  "event IdentityCreated(uint256 indexed identityId, address indexed owner, string uri)"
];

const CredentialRegistryABI = [
  "function requestReputationUpdate(uint256 identityId, string memory evidence) external",
  "function getCredential(uint256 id) external view returns (uint256 subjectId, address issuer, string memory uri, uint8 status)"
];

export const CONTRACT_ADDRESSES = {
  IdentityRegistry: process.env.NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS || "0x0000000000000000000000000000000000000000",
  CredentialRegistry: process.env.NEXT_PUBLIC_CREDENTIAL_REGISTRY_ADDRESS || "0x0000000000000000000000000000000000000000",
};

/**
 * Gets an Ethereum provider based on the environment
 */
export const getProvider = () => {
  // Browser environment
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  
  // Server environment or no browser wallet
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://public-node.testnet.rsk.co";
  return new ethers.JsonRpcProvider(rpcUrl);
};

/**
 * Gets the identity registry contract instance
 */
export const getIdentityRegistry = async (signer?: ethers.Signer) => {
  const provider = getProvider();
  const contractAddress = CONTRACT_ADDRESSES.IdentityRegistry;
  
  if (signer) {
    return new ethers.Contract(contractAddress, IdentityRegistryABI, signer);
  }
  
  return new ethers.Contract(contractAddress, IdentityRegistryABI, provider);
};

/**
 * Gets the credential registry contract instance
 */
export const getCredentialRegistry = async (signer?: ethers.Signer) => {
  const provider = getProvider();
  const contractAddress = CONTRACT_ADDRESSES.CredentialRegistry;
  
  if (signer) {
    return new ethers.Contract(contractAddress, CredentialRegistryABI, signer);
  }
  
  return new ethers.Contract(contractAddress, CredentialRegistryABI, provider);
};

export interface Identity {
  id: string;
  owner: string;
  uri: string;
  timestamp: number;
}

export interface Credential {
  id: string;
  subjectId: string;
  issuer: string;
  uri: string;
  status: number;
}

/**
 * Creates a new identity
 */
export const createIdentity = async (uri: string) => {
  const provider = getProvider();
  const signer = await provider.getSigner();
  const identityRegistry = await getIdentityRegistry(signer);
  
  const tx = await identityRegistry.createIdentity(uri);
  const receipt = await tx.wait();
  
  // Extract the identity ID from the event logs
  const event = receipt.logs.find((log: any) => {
    const eventFragment = identityRegistry.interface.getEvent('IdentityCreated');
    // Make sure eventFragment is not null before using it
    if (!eventFragment) return false;
    // Use ethers.id to get the hash of the event signature
    return log.topics[0] === ethers.id(eventFragment.format());
  });
  
  if (event) {
    const eventFragment = identityRegistry.interface.getEvent('IdentityCreated');
    if (!eventFragment) {
      throw new Error("Failed to get IdentityCreated event fragment");
    }
    
    const decodedData = identityRegistry.interface.decodeEventLog(
      eventFragment,
      event.data,
      event.topics
    );
    return decodedData.identityId;
  }
  
  throw new Error("Failed to extract identity ID from transaction logs");
};

/**
 * Gets identity details
 */
export const getIdentity = async (id: string): Promise<Identity> => {
  const identityRegistry = await getIdentityRegistry();
  const identityData = await identityRegistry.getIdentity(id);
  
  return {
    id,
    owner: identityData[0],
    uri: identityData[1],
    timestamp: Number(identityData[2])
  };
};

/**
 * Updates identity metadata
 */
export const updateIdentityMetadata = async (id: string, newUri: string) => {
  const provider = getProvider();
  const signer = await provider.getSigner();
  const identityRegistry = await getIdentityRegistry(signer);
  
  const tx = await identityRegistry.updateMetadata(id, newUri);
  await tx.wait();
};

/**
 * Checks if an identity exists
 */
export const identityExists = async (id: string): Promise<boolean> => {
  const identityRegistry = await getIdentityRegistry();
  return await identityRegistry.identityExists(id);
};

/**
 * Requests a reputation update
 */
export const requestReputationUpdate = async (identityId: string, evidence: string) => {
  const provider = getProvider();
  const signer = await provider.getSigner();
  const credentialRegistry = await getCredentialRegistry(signer);
  
  const tx = await credentialRegistry.requestReputationUpdate(identityId, evidence);
  await tx.wait();
};

/**
 * Gets credential details
 */
export const getCredential = async (id: string): Promise<Credential> => {
  const credentialRegistry = await getCredentialRegistry();
  const credentialData = await credentialRegistry.getCredential(id);
  
  return {
    id,
    subjectId: credentialData[0].toString(),
    issuer: credentialData[1],
    uri: credentialData[2],
    status: credentialData[3]
  };
};

/**
 * Get an ethers contract instance for the IdentityRegistry contract
 */
export function getIdentityRegistryContract(
  provider: ethers.Provider, 
  networkName: string = "testnet"
) {
  const address = contracts[networkName].identityRegistry;
  return IdentityRegistry__factory.connect(address, provider);
}

/**
 * Get an ethers contract instance for the TrustID contract
 */
export function getTrustIDContract(
  provider: ethers.Provider, 
  networkName: string = "testnet"
) {
  const address = contracts[networkName].trustId;
  return TrustID__factory.connect(address, provider);
}

/**
 * Get an identity's DID from a transaction receipt
 * @param receipt The transaction receipt from creating an identity
 * @returns The DID of the created identity or null if not found
 */
export async function getDidFromReceipt(receipt: ethers.TransactionReceipt) {
  if (!receipt.status) {
    throw new Error("Transaction failed");
  }
  
  // Get the identity registry contract
  const identityRegistry = await getIdentityRegistry();
  
  // Get the logs from the receipt
  const logs = receipt.logs || [];
  
  // Find the IdentityCreated event
  const eventFragment = identityRegistry.interface.getEvent('IdentityCreated');
  if (!eventFragment) {
    throw new Error("IdentityCreated event not found in contract ABI");
  }
  
  const eventTopic = ethers.id(eventFragment.format());
  const log = logs.find(log => log.topics[0] === eventTopic);
  
  if (!log) {
    return null;
  }
  
  // Decode the event data
  const event = identityRegistry.interface.parseLog({
    topics: log.topics as string[],
    data: log.data
  });
  
  if (!event) {
    return null;
  }
  
  // Return the DID
  return event.args[0] as string;
}

/**
 * Format a username to a DID
 */
export function formatUsernameToDid(username: string): string {
  return `did:rsk:${username}`;
}

/**
 * Parse a DID to extract the username
 */
export function parseDidToUsername(did: string): string | null {
  if (!did.startsWith('did:rsk:')) {
    return null;
  }
  
  return did.replace('did:rsk:', '');
} 