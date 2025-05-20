import { createThirdwebClient } from "thirdweb";

// Define the client ID (get this from thirdweb dashboard)
export const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "";

// Create the client instance
export const client = createThirdwebClient({
  clientId,
  // You can add more configurations here
});