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