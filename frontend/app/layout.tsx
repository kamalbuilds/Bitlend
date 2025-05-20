"use client";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";
import Link from 'next/link';
import { ConnectButton, ThirdwebProvider } from "thirdweb/react";
import { client } from "@/lib/client";
import { EXSAT_CHAIN_CONFIG } from "@/config/contracts";
import { defineChain } from "thirdweb";
import { ThemeToggle } from "@/components/theme-toggle";


const inter = Inter({ subsets: ["latin"] });



export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const exsattestnetchain = defineChain({
    id: 839999,
    name: "exSat Testnet",
    rpc: "https://evm-tst3.exsat.network/",
    nativeCurrency: {
      name: "BTC", 
      symbol: "BTC",
      decimals: 18,
    },
  });

  const chains = [exsattestnetchain];
  
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThirdwebProvider>
          <header className="border-b">
            <div className="container flex h-16 items-center justify-between max-w-7xl mx-auto px-4">
              <Link href="/" className="text-xl font-bold">BitLend</Link>
              <div>
                <ConnectButton 
                  client={client}
                  chains={chains}
                />
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="py-8">
            {children}
          </main>
          <footer className="border-t py-6">
            <div className="container max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
              <p>© {new Date().getFullYear()} BitLend. Built on <a href="https://exsa.io/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Exsat</a></p>
            </div>
          </footer>
        </ThirdwebProvider>
      </body>
    </html>
  );
}
