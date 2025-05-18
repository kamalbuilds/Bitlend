import { getContract } from "thirdweb";
import { useReadContract, useSendTransaction, useActiveAccount } from "thirdweb/react";
import contracts from '@/config/contracts';
import { client } from '@/lib/client';

/**
 * Hook to get the TrustID Factory contract
 */
export function useTrustIDFactory(networkName: string = 'testnet') {
  const addresses = contracts[networkName];
  
  const contract = getContract({
    address: addresses.trustIdFactory,
    client
  });
  
  return { contract };
}

/**
 * Hook to get the TrustID contract
 */
export function useTrustID(networkName: string = 'testnet') {
  const addresses = contracts[networkName];
  
  const contract = getContract({
    address: addresses.trustId,
    client
  });
  
  return { contract };
}

/**
 * Hook to get the AI Reputation Oracle contract
 */
export function useAIReputationOracle(networkName: string = 'testnet') {
  const addresses = contracts[networkName];
  
  const contract = getContract({
    address: addresses.aiReputationOracle,
    client
  });
  
  return { contract };
}

/**
 * Check if a username is available
 */
export function useIsUsernameAvailable(username: string) {
  const { contract } = useTrustIDFactory();
  
  return useReadContract({
    contract,
    functionName: "isUsernameAvailable",
    args: [username]
  });
}

/**
 * Create a new identity
 */
export function useCreateIdentity() {
  const { contract } = useTrustIDFactory();
  
  return useSendTransaction();
}

/**
 * Get identity details
 */
export function useGetIdentity(did: string) {
  const { contract } = useTrustID();
  
  return useReadContract({
    contract,
    functionName: "getIdentity",
    args: [did]
  });
}

/**
 * Update identity metadata
 */
export function useUpdateIdentity() {
  const { contract } = useTrustID();
  
  return useSendTransaction();
}

/**
 * Get identity credentials
 */
export function useGetIdentityCredentials(did: string) {
  const { contract } = useTrustID();
  
  return useReadContract({
    contract,
    functionName: "getIdentityCredentials",
    args: [did]
  });
}

/**
 * Get credential details
 */
export function useGetCredential(credentialId: string) {
  const { contract } = useTrustID();
  
  return useReadContract({
    contract,
    functionName: "getCredential",
    args: [credentialId]
  });
}

/**
 * Verify a credential
 */
export function useVerifyCredential(credentialId: string) {
  const { contract } = useTrustID();
  
  return useReadContract({
    contract,
    functionName: "verifyCredential",
    args: [credentialId]
  });
}

/**
 * Get reputation score
 */
export function useGetReputation(did: string) {
  const { contract } = useTrustID();
  
  return useReadContract({
    contract,
    functionName: "getReputation",
    args: [did]
  });
}

/**
 * Get category reputation
 */
export function useGetCategoryReputation(did: string, category: string) {
  const { contract } = useTrustID();
  
  return useReadContract({
    contract,
    functionName: "getCategoryReputation",
    args: [did, category]
  });
}

/**
 * Request reputation update
 */
export function useRequestReputationUpdate() {
  const { contract } = useAIReputationOracle();
  
  return useSendTransaction();
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

/**
 * Format a username to a DID
 */
export function formatUsernameToDid(username: string): string {
  return `did:rsk:${username}`;
}

/**
 * Get the connected wallet address
 */
export function useWalletAddress() {
  const account = useActiveAccount();
  return account?.address;
} 