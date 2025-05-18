"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Web3Button } from "thirdweb/react";
import { useIsUsernameAvailable, formatUsernameToDid, useWalletAddress } from "@/lib/thirdweb-contracts";
import Link from "next/link";

export default function CreateIdentityPage() {
  const router = useRouter();
  const address = useWalletAddress();
  
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [githubHandle, setGithubHandle] = useState("");
  
  // Form validation
  const [usernameError, setUsernameError] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  
  // Check username availability with debounce
  const { data: isAvailable, isLoading: isCheckingAvailability } = 
    useIsUsernameAvailable(username.length > 2 ? username : "");
  
  // Handle username change with validation
  const handleUsernameChange = (value: string) => {
    setUsername(value);
    
    // Basic validation
    if (value.length < 3) {
      setUsernameError("Username must be at least 3 characters");
    } else if (!/^[a-z0-9_-]+$/.test(value)) {
      setUsernameError("Username can only contain lowercase letters, numbers, underscores and hyphens");
    } else {
      setUsernameError("");
    }
  };
  
  // Create metadata JSON
  const createMetadata = () => {
    const metadata = {
      fullName,
      bio,
      email,
      socialLinks: {
        ...(twitterHandle && { twitter: `https://twitter.com/${twitterHandle}` }),
        ...(githubHandle && { github: `https://github.com/${githubHandle}` }),
      },
    };
    
    // Encode as data URI
    return `data:application/json,${encodeURIComponent(JSON.stringify(metadata))}`;
  };
  
  // Handle identity creation success
  const handleSuccess = () => {
    // Redirect to the view page with the new DID
    const did = formatUsernameToDid(username);
    router.push(`/identity/view?did=${did}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Create Your Digital Identity</h1>
      
      {!address ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6 text-center">
          <p className="text-amber-800 mb-4">Please connect your wallet to create an identity</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6">
          <form className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-4">Basic Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-2" htmlFor="username">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="username"
                      value={username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                        usernameError ? "border-red-500" : ""
                      }`}
                      placeholder="Choose a unique username (e.g., alice123)"
                    />
                    
                    {username.length > 2 && !usernameError && (
                      <div className="absolute right-3 top-2.5">
                        {isCheckingAvailability ? (
                          <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : isAvailable ? (
                          <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {usernameError && (
                    <p className="text-red-500 text-sm mt-1">{usernameError}</p>
                  )}
                  
                  {username.length > 2 && !usernameError && !isAvailable && (
                    <p className="text-red-500 text-sm mt-1">This username is already taken. Please choose another one.</p>
                  )}
                  
                  <p className="text-sm text-gray-500 mt-2">
                    Your DID will be: <span className="font-medium">{username ? formatUsernameToDid(username) : "did:rsk:username"}</span>
                  </p>
                </div>
                
                <div>
                  <label className="block text-gray-700 font-bold mb-2" htmlFor="fullName">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="Your full name"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-bold mb-2" htmlFor="bio">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="Short description about yourself"
                    rows={3}
                  ></textarea>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-xl font-bold mb-4">Contact Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-2" htmlFor="email">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    placeholder="Your email address"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-bold mb-2" htmlFor="twitter">
                    Twitter Handle
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                      @
                    </span>
                    <input
                      type="text"
                      id="twitter"
                      value={twitterHandle}
                      onChange={(e) => setTwitterHandle(e.target.value)}
                      className="shadow appearance-none border rounded-r-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="yourusername"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 font-bold mb-2" htmlFor="github">
                    GitHub Handle
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                      github.com/
                    </span>
                    <input
                      type="text"
                      id="github"
                      value={githubHandle}
                      onChange={(e) => setGithubHandle(e.target.value)}
                      className="shadow appearance-none border rounded-r-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      placeholder="yourusername"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4">
              <Link 
                href="/identity"
                className="inline-flex h-10 items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </Link>
              
              <Web3Button
                contractAddress={process.env.NEXT_PUBLIC_TRUSTID_FACTORY_ADDRESS || ""}
                action={(contract: any) => {
                  return contract.call(
                    "createIdentity",
                    [username, createMetadata()]
                  );
                }}
                onSuccess={handleSuccess}
                disabled={!username || !!usernameError || !isAvailable}
                className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Create Identity
              </Web3Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
} 