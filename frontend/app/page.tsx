"use client";

import { useState, useEffect } from 'react';
import { ConnectButton } from "thirdweb/react";
import { Dashboard } from '@/components/Dashboard';
import { BridgeModal } from '@/components/BridgeModal';
import { client } from '@/lib/thirdweb';

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [showBridgeModal, setShowBridgeModal] = useState(false);

  return (
    <main className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      
      <div className="py-10">
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          {connected ? (
            <Dashboard 
              address={address} 
              onBridgeClick={() => setShowBridgeModal(true)}
            />
          ) : (
            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
              <div className="px-4 py-16 sm:p-12 text-center">
                <h3 className="text-2xl leading-8 font-bold text-gray-900 dark:text-white">
                  Welcome to BitLend
                </h3>
                <div className="mt-4 text-lg text-gray-500 dark:text-gray-400">
                  <p>The Trustless Bitcoin Lending Protocol on exSat Network</p>
                </div>
                <div className="mt-6 text-base text-gray-500 dark:text-gray-400 max-w-3xl mx-auto">
                  <p>BitLend allows Bitcoin holders to collateralize their BTC to borrow stablecoins or XSAT tokens.</p>
                  <p className="mt-2">Connect your wallet to get started with your lending journey.</p>
                </div>
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    onClick={() => setShowBridgeModal(true)}
                  >
                    Learn How to Bridge BTC
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {showBridgeModal && (
        <BridgeModal onClose={() => setShowBridgeModal(false)} />
      )}
    </main>
  );
}
