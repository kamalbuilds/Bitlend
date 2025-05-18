"use client";

import { useState } from "react";
import { getIdentityCredentials, parseDidToUsername } from "@/lib/trustid";

export default function CredentialsPage() {
  const [did, setDid] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState<any[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!did) {
      setError("Please enter a DID to view credentials");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const creds = await getIdentityCredentials(did);
      setCredentials(creds);
      
      if (creds.length === 0) {
        setError("No credentials found for this DID");
      }
    } catch (error) {
      console.error("Error fetching credentials:", error);
      setError("Failed to fetch credentials. Please ensure the DID exists and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Format date from timestamp
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  // Get username from DID for display
  const getUsername = (did: string) => {
    const username = parseDidToUsername(did);
    return username || did;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Credential Verification</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Find Credentials by DID</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-bold mb-2" htmlFor="did">
              Decentralized Identifier (DID)
            </label>
            <input
              type="text"
              id="did"
              value={did}
              onChange={(e) => setDid(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Enter DID (did:rsk:username)"
            />
          </div>
          
          <div className="flex items-center">
            <button
              type="submit"
              disabled={loading}
              className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Searching..." : "Find Credentials"}
            </button>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p>{error}</p>
            </div>
          )}
        </form>
      </div>
      
      {credentials.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Credentials for {getUsername(did)}</h2>
          
          <div className="grid gap-6">
            {credentials.map((credential) => (
              <div key={credential.id} className="border rounded-lg p-4">
                <div className={`text-right text-sm mb-2 ${credential.valid ? 'text-green-600' : 'text-red-600'}`}>
                  {credential.valid ? 'Valid' : 'Invalid'}
                </div>
                
                <h3 className="text-lg font-bold capitalize">{credential.type}</h3>
                
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Issuer</div>
                    <div className="font-medium">{credential.issuer.substring(0, 10)}...{credential.issuer.substring(credential.issuer.length - 8)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Issued Date</div>
                    <div className="font-medium">{formatDate(credential.issuedAt)}</div>
                  </div>
                  
                  {credential.expiresAt > 0 && (
                    <div>
                      <div className="text-gray-500">Expires</div>
                      <div className="font-medium">{formatDate(credential.expiresAt)}</div>
                    </div>
                  )}
                  
                  {credential.revoked && (
                    <div>
                      <div className="text-red-500 font-bold">Revoked</div>
                    </div>
                  )}
                </div>
                
                <div className="mt-4">
                  <a 
                    href={credential.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-sm"
                  >
                    View Credential Data
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 