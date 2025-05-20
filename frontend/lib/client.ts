import { createThirdwebClient } from "thirdweb";

// Create the client configured with your web3 infrastructure
export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "",
});