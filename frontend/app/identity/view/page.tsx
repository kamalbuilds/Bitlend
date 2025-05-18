"use client";

import { useState } from "react";
import { getIdentity, parseDidToUsername, formatUsernameToDid } from "@/lib/trustid";

export default function ViewIdentityPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [identity, setIdentity] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery) {
      setError("Please enter a username or DID");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      // Determine if input is a username or DID
      const did = searchQuery.startsWith("did:") 
        ? searchQuery 
        : formatUsernameToDid(searchQuery);
      
      const identityData = await getIdentity(did);
      
      if (identityData) {
        setIdentity(identityData);
      } else {
        setError("Identity not found. Please check the username or DID and try again.");
      }
    } catch (error) {
      console.error("Error fetching identity:", error);
      setError("Failed to fetch identity. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Try to parse metadata JSON
  const parseMetadata = (metadataURI: string) => {
    try {
      if (metadataURI.startsWith('data:application/json,')) {
        const jsonStr = decodeURIComponent(metadataURI.replace('data:application/json,', ''));
        return JSON.parse(jsonStr);
      }
      return null;
    } catch (error) {
      console.error("Error parsing metadata:", error);
      return null;
    }
  };

  // Format date from timestamp
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">View Identity</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Search Identity</h2>
        
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-bold mb-2" htmlFor="searchQuery">
              Username or DID
            </label>
            <input
              type="text"
              id="searchQuery"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Enter username or DID (did:rsk:username)"
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
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p>{error}</p>
            </div>
          )}
        </form>
      </div>
      
      {identity && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              Identity Profile: {parseDidToUsername(identity.did) || identity.did}
            </h2>
            <div className={`text-sm font-medium ${identity.active ? 'text-green-600' : 'text-red-600'}`}>
              {identity.active ? 'Active' : 'Inactive'}
            </div>
          </div>
          
          <div className="mt-6 grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
              
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-500">DID</div>
                  <div className="font-medium break-all">{identity.did}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-500">Owner Address</div>
                  <div className="font-medium">{identity.owner}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-500">Created</div>
                  <div className="font-medium">{formatDate(identity.createdAt)}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-500">Last Updated</div>
                  <div className="font-medium">{formatDate(identity.updatedAt)}</div>
                </div>
              </div>
            </div>
            
            <div>
              {parseMetadata(identity.metadataURI) && (
                <>
                  <h3 className="text-lg font-semibold mb-3">Profile Information</h3>
                  
                  <div className="space-y-3">
                    {(() => {
                      const metadata = parseMetadata(identity.metadataURI);
                      if (!metadata) return null;
                      
                      return (
                        <>
                          {metadata.fullName && (
                            <div>
                              <div className="text-sm text-gray-500">Full Name</div>
                              <div className="font-medium">{metadata.fullName}</div>
                            </div>
                          )}
                          
                          {metadata.bio && (
                            <div>
                              <div className="text-sm text-gray-500">Bio</div>
                              <div className="font-medium">{metadata.bio}</div>
                            </div>
                          )}
                          
                          {metadata.email && (
                            <div>
                              <div className="text-sm text-gray-500">Email</div>
                              <div className="font-medium">{metadata.email}</div>
                            </div>
                          )}
                          
                          {metadata.socialLinks && Object.keys(metadata.socialLinks).length > 0 && (
                            <div>
                              <div className="text-sm text-gray-500">Social Links</div>
                              <div className="space-y-1">
                                {Object.entries(metadata.socialLinks).map(([platform, url]) => (
                                  <div key={platform}>
                                    <a 
                                      href={url as string} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      {platform}
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </>
              )}
              
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-3">Actions</h3>
                <div className="flex flex-wrap gap-2">
                  <a 
                    href={`/identity/update?did=${identity.did}`}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Update Profile
                  </a>
                  
                  <a 
                    href={`/credentials?did=${identity.did}`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View Credentials
                  </a>
                  
                  <a 
                    href={`/reputation?did=${identity.did}`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Check Reputation
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 