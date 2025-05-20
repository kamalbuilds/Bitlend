# Thirdweb v4 to v5 Migration Guide for BitLend Protocol

## Overview

This document outlines the key changes needed to migrate the BitLend protocol frontend from thirdweb v4 to v5. We've successfully implemented these changes in the codebase.

## Key Changes Implemented

### 1. Updated Package Dependencies

```json
"dependencies": {
  // Other dependencies...
  "ethers": "^6.9.2",      // Using ethers v6 directly
  "thirdweb": "^5.96.5"    // Updated to thirdweb v5
}
```

### 2. Import Changes

#### Old imports (v4):
```typescript
import { useContract, useContractRead, useContractWrite, useAddress } from "@thirdweb-dev/react";
import { parseUnits, formatUnits } from "ethers/lib/utils";  // Old ethers path
```

#### New imports (v5):
```typescript
import { useActiveAccount, useReadContract, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { parseUnits, formatUnits } from "ethers";  // Direct import from ethers v6
```

### 3. Client Configuration

Created a simplified client configuration:

```typescript
// lib/client.ts
import { createThirdwebClient } from "thirdweb";

export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "",
});
```

### 4. ThirdwebProvider Changes

Updated the ThirdwebProvider to use the simplified v5 pattern:

```typescript
// components/ThirdwebProviderWrapper.tsx
import { ThirdwebProvider } from "thirdweb/react";
import { ReactNode } from "react";

interface ThirdwebProviderWrapperProps {
  children: ReactNode;
}

export default function ThirdwebProviderWrapper({ children }: ThirdwebProviderWrapperProps) {
  return (
    <ThirdwebProvider>
      {children}
    </ThirdwebProvider>
  );
}
```

### 5. Custom Hooks for Contract Interactions

Created custom hooks to abstract contract interactions for consistent usage across components:

```typescript
// hooks/useContractInteraction.ts

// Get contract instance
export const useContractInstance = (contractAddress: string) => {
  // Implementation...
};

// Read data from contracts
export const useContractData = (
  contractAddress: string,
  functionName: string,
  args: any[] = []
) => {
  // Implementation...
};

// Execute contract write operations
export const useContractAction = (
  contractAddress: string,
  functionName: string
) => {
  // Implementation...
};

// Other specialized hooks for specific flows
export const useDepositFlow = (tokenAddress: string, vaultAddress: string) => {
  // Implementation...
};
```

### 6. Updated Components

Refactored all components to use the new hooks and v5 patterns:

- DepositPanel
- BorrowPanel
- RepayPanel
- WithdrawPanel
- BridgeModal

## Key API Changes

1. **Contract Instantiation**:
   - v4: `useContract(contractAddress)`
   - v5: `getContract({ client, address: contractAddress, chain })`

2. **Reading from Contracts**:
   - v4: `useContractRead(contract, "methodName", [args])`
   - v5: `useReadContract({ contract, method: "methodName", params: [args] })`

3. **Writing to Contracts**:
   - v4: `useContractWrite(contract, "methodName")` and then `mutateAsync({ args: [params] })`
   - v5: First `prepareContractCall({ contract, method, params })` then `useSendTransaction().mutateAsync(transaction)`

4. **Wallet Connectivity**:
   - v4: `useAddress()`
   - v5: `useActiveAccount().address`

## Chain Configuration

We simplified the chain configuration by using a standard format for exSat networks:

```typescript
const chainConfig = {
  id: process.env.NEXT_PUBLIC_DEFAULT_NETWORK === "mainnet" ? 7200 : 839999,
  name: process.env.NEXT_PUBLIC_DEFAULT_NETWORK === "mainnet" ? "exSat Network" : "exSat Testnet",
  rpc: process.env.NEXT_PUBLIC_DEFAULT_NETWORK === "mainnet" 
    ? "https://evm.exsat.network/" 
    : "https://evm-tst3.exsat.network/",
};
```

## Conclusion

The migration from thirdweb v4 to v5 required significant changes to the codebase, but resulted in a more streamlined and consistent API. The key improvements include:

1. Better type safety and error handling
2. More intuitive hook naming conventions
3. Simplified contract interaction patterns
4. Direct imports from ethers v6
5. More maintainable custom hooks for common operations

These changes ensure that the BitLend protocol now leverages the latest improvements in thirdweb's SDK while maintaining all existing functionality. 