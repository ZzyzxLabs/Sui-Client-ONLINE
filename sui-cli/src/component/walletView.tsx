"use client";
import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { useEffect, useState } from "react";

// Add custom CSS animations
const animationStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fade-in {
    animation: fadeIn 0.5s ease-out forwards;
  }
  
  @keyframes slideDown {
    from { transform: translateY(-10px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  .animate-slide-down {
    animation: slideDown 0.3s ease-out;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = animationStyles;
  document.head.appendChild(style);
}

// Component to display object fields in a collapsible format
function ObjectFieldsDisplay({ fields }: { fields: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!fields || typeof fields !== 'object') {
    return <span className="text-gray-400">No fields</span>;
  }

  const fieldEntries = Object.entries(fields);

  const copyToClipboard = async (text: string, fieldKey: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 300);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-blue-500 hover:text-blue-700 text-sm flex items-center transition-colors duration-200"
      >
        <span className={`mr-1 transition-transform duration-200 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>
          ▶
        </span>
        {fieldEntries.length} fields
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="mt-2 space-y-1 border-l-2 border-gray-200 pl-3">
          {fieldEntries.map(([key, value]) => {
            const valueStr = typeof value === 'object' && value !== null ? 
              JSON.stringify(value) : 
              String(value);
            
            return (
              <div key={key} className="text-xs group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 mr-2">
                    <span className="font-medium text-gray-700">{key}:</span>{' '}
                    <span 
                      className={`cursor-pointer break-all transition-colors duration-300 ${
                        copiedField === key ? 'text-green-400' : 'text-gray-600'
                      }`}
                      onClick={() => copyToClipboard(valueStr, key)}
                      title="Click to copy"
                    >
                      {valueStr}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Component to display a single object in grid format
function ObjectCard({ objectData }: { objectData: any }) {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const data = objectData.data;

  const copyToClipboard = async (text: string, itemType: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(itemType);
      setTimeout(() => setCopiedItem(null), 300);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const CopyableText = ({ text, itemType, className = "" }: {
    text: string;
    itemType: string;
    className?: string;
  }) => {
    return (
      <span 
        className={`cursor-pointer break-all transition-colors duration-300 ${
          copiedItem === itemType ? 'text-green-400' : 'text-gray-600'
        } ${className}`}
        onClick={() => copyToClipboard(text, itemType)}
        title="Click to copy"
      >
        {text}
      </span>
    );
  };
  
  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-white hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 ease-in-out">
      <div className="grid grid-cols-3 gap-4">
        {/* Object ID Column */}
        <div className="animate-fade-in">
          <h4 className="font-semibold text-sm text-gray-800 mb-2">Object</h4>
          <div className="space-y-1 text-xs">
            <div>
              <span className="font-medium">ID:</span>{' '}
              <CopyableText text={data.objectId} itemType="objectId" />
            </div>
            <div>
              <span className="font-medium">Version:</span>{' '}
              <CopyableText text={data.version} itemType="version" />
            </div>
            <div>
              <span className="font-medium">Digest:</span>{' '}
              <CopyableText text={data.digest} itemType="digest" />
            </div>
          </div>
        </div>

        {/* Type Column */}
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h4 className="font-semibold text-sm text-gray-800 mb-2">Type</h4>
          <div className="text-xs break-all">
            <CopyableText text={data.type} itemType="type" />
          </div>
        </div>

        {/* Fields Column */}
        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h4 className="font-semibold text-sm text-gray-800 mb-2">Fields</h4>
          <ObjectFieldsDisplay fields={data.content?.fields} />
        </div>
      </div>
    </div>
  );
}

export default function WalletDashboard() {
  const [inputAccount, setInputAccount] = useState("");
  const [queryCurrentAccount, setQueryCurrentAccount] = useState(false);
  const [queryInputAccount, setQueryInputAccount] = useState(false);
  const [currentAccountAllObjects, setCurrentAccountAllObjects] = useState<any[]>([]);
  const [inputAccountAllObjects, setInputAccountAllObjects] = useState<any[]>([]);
  const [currentAccountCursor, setCurrentAccountCursor] = useState<string | null>(null);
  const [inputAccountCursor, setInputAccountCursor] = useState<string | null>(null);
  const [loadingCurrentComplete, setLoadingCurrentComplete] = useState(false);
  const [loadingInputComplete, setLoadingInputComplete] = useState(false);
  const [currentAccountFinished, setCurrentAccountFinished] = useState(false);
  const [inputAccountFinished, setInputAccountFinished] = useState(false);
  
  const currentAccount = useCurrentAccount();
  
  // Query for current account
  const currentAccountData = useSuiClientQuery("getOwnedObjects", {
    owner: currentAccount?.address || "",
    cursor: currentAccountCursor,
    options: {
      showBcs: true,
      showContent: true,
      showDisplay: true,
      showType: true,
    },
  }, {
    enabled: queryCurrentAccount && !!currentAccount?.address,
  });

  // Query for input account
  const inputAccountData = useSuiClientQuery("getOwnedObjects", {
    owner: inputAccount,
    cursor: inputAccountCursor,
    options: {
      showBcs: true,
      showContent: true,
      showDisplay: true,
      showType: true,
    },
  }, {
    enabled: queryInputAccount && !!inputAccount,
  });

  // Handle current account data updates and pagination
  useEffect(() => {
    if (currentAccountData?.data) {
      if (currentAccountCursor === null) {
        // First query - replace all data
        setCurrentAccountAllObjects(currentAccountData.data.data || []);
      } else {
        // Subsequent query - append data
        setCurrentAccountAllObjects(prev => [...prev, ...(currentAccountData.data.data || [])]);
      }

      // Check if there's more data to fetch
      if (currentAccountData.data.hasNextPage && currentAccountData.data.nextCursor) {
        setCurrentAccountCursor(currentAccountData.data.nextCursor);
      } else {
        // No more pages, mark as finished
        setCurrentAccountFinished(true);
        setLoadingCurrentComplete(false);
      }
    }
  }, [currentAccountData?.data, currentAccountCursor]);

  // Handle input account data updates and pagination
  useEffect(() => {
    if (inputAccountData?.data) {
      if (inputAccountCursor === null) {
        // First query - replace all data
        setInputAccountAllObjects(inputAccountData.data.data || []);
      } else {
        // Subsequent query - append data
        setInputAccountAllObjects(prev => [...prev, ...(inputAccountData.data.data || [])]);
      }

      // Check if there's more data to fetch
      if (inputAccountData.data.hasNextPage && inputAccountData.data.nextCursor) {
        setInputAccountCursor(inputAccountData.data.nextCursor);
      } else {
        // No more pages, mark as finished
        setInputAccountFinished(true);
        setLoadingInputComplete(false);
      }
    }
  }, [inputAccountData?.data, inputAccountCursor]);

  const handleQueryCurrentAccount = () => {
    setQueryCurrentAccount(true);
    setCurrentAccountCursor(null);
    setCurrentAccountAllObjects([]);
    setLoadingCurrentComplete(true);
    setCurrentAccountFinished(false);
  };

  const handleQueryInputAccount = () => {
    if (inputAccount.trim()) {
      setQueryInputAccount(true);
      setInputAccountCursor(null);
      setInputAccountAllObjects([]);
      setLoadingInputComplete(true);
      setInputAccountFinished(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-5">
      {/* Current Account Card */}
      <div className="border border-gray-200 rounded-lg p-5 my-4 bg-white shadow-sm">
        <h3 className="mt-0 mb-4 text-lg font-semibold">Current Account Query</h3>
        <p className="mb-4 text-gray-500">
          Connected Account: {currentAccount?.address || "Not connected"}
        </p>
        <button 
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 border-none rounded cursor-pointer mr-2 disabled:cursor-not-allowed"
          onClick={handleQueryCurrentAccount}
          disabled={!currentAccount?.address}
        >
          Query Current Account
        </button>
        {queryCurrentAccount && (
          <div className="mt-4">
            {loadingCurrentComplete ? (
              <div className="text-blue-500 animate-fade-in">
                <h4 className="text-base font-medium mb-2">Fetching all objects...</h4>
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                  <p className="text-sm">Currently loaded: {currentAccountAllObjects.length} objects</p>
                </div>
              </div>
            ) : currentAccountFinished ? (
              <div className="animate-fade-in">
                <h4 className="text-base font-medium mb-4">
                  Current Account Objects ({currentAccountAllObjects.length} total):
                </h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {currentAccountAllObjects.map((obj, index) => (
                    <div 
                      key={`${obj.data.objectId}-${index}`}
                      className="animate-slide-down"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <ObjectCard objectData={obj} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Input Account Card */}
      <div className="border border-gray-200 rounded-lg p-5 my-4 bg-white shadow-sm">
        <h3 className="mt-0 mb-4 text-lg font-semibold">Query Another Account</h3>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Enter account address (0x...)"
            value={inputAccount}
            onChange={(e) => setInputAccount(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 mr-2 w-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button 
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 border-none rounded cursor-pointer disabled:cursor-not-allowed"
            onClick={handleQueryInputAccount}
            disabled={!inputAccount.trim()}
          >
            Query Account
          </button>
        </div>
        {queryInputAccount && inputAccount && (
          <div className="mt-4">
            {loadingInputComplete ? (
              <div className="text-blue-500 animate-fade-in">
                <h4 className="text-base font-medium mb-2">Fetching all objects for: {inputAccount}</h4>
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                  <p className="text-sm">Currently loaded: {inputAccountAllObjects.length} objects</p>
                </div>
              </div>
            ) : inputAccountFinished ? (
              <div className="animate-fade-in">
                <h4 className="text-base font-medium mb-4">
                  Account Objects for: {inputAccount} ({inputAccountAllObjects.length} total)
                </h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {inputAccountAllObjects.map((obj, index) => (
                    <div 
                      key={`${obj.data.objectId}-${index}`}
                      className="animate-slide-down"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <ObjectCard objectData={obj} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
