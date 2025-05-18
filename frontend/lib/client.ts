import { createThirdwebClient } from "thirdweb";

// Create the thirdweb client
// Note: In the public client environment (browser), 
// only clientId is required.
export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID,
});