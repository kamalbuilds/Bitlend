export default function IdentityPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Digital Identity</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-blue-600">
          <h2 className="text-xl font-bold mb-4">Create Identity</h2>
          <p className="text-gray-600 mb-4">
            Create your own self-sovereign digital identity on Rootstock blockchain.
            Own your data and control who can access it.
          </p>
          <a 
            href="/identity/create" 
            className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-8 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-700"
          >
            Create Identity
          </a>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-green-600">
          <h2 className="text-xl font-bold mb-4">View Identity</h2>
          <p className="text-gray-600 mb-4">
            Look up an existing identity by DID or username to view their profile information.
          </p>
          <a 
            href="/identity/view" 
            className="inline-flex h-10 items-center justify-center rounded-md bg-green-600 px-8 text-sm font-medium text-white shadow transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-green-700"
          >
            Lookup Identity
          </a>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-purple-600">
          <h2 className="text-xl font-bold mb-4">Credentials</h2>
          <p className="text-gray-600 mb-4">
            View, verify, and manage credentials associated with an identity.
          </p>
          <a 
            href="/credentials" 
            className="inline-flex h-10 items-center justify-center rounded-md bg-purple-600 px-8 text-sm font-medium text-white shadow transition-colors hover:bg-purple-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-700"
          >
            Manage Credentials
          </a>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-amber-600">
          <h2 className="text-xl font-bold mb-4">Reputation Score</h2>
          <p className="text-gray-600 mb-4">
            Check your reputation score powered by AI analysis of on-chain activity.
          </p>
          <a 
            href="/reputation" 
            className="inline-flex h-10 items-center justify-center rounded-md bg-amber-600 px-8 text-sm font-medium text-white shadow transition-colors hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-700"
          >
            Check Reputation
          </a>
        </div>
      </div>
      
      <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
        <h2 className="text-xl font-bold mb-2">About Digital Identities on Rootstock</h2>
        <p className="text-gray-700">
          TrustID creates self-sovereign identities on the Rootstock blockchain, powered by RIF Identity infrastructure.
          Your identity is stored on the blockchain and is fully controlled by you. No central authority can access
          or manipulate your identity data without your permission.
        </p>
        <div className="mt-4">
          <a 
            href="https://developers.rsk.co/rif/identity/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Learn more about RIF Identity →
          </a>
        </div>
      </div>
    </div>
  );
} 