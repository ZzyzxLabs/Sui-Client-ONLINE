"use client";
import React, { useState } from 'react';
import { useSuiClientQueries, useSuiClientQuery } from '@mysten/dapp-kit';
import { LoadingSpinnerIcon, CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from './icons/StatusIcons';

// Define the Coin interface based on SUI's coin balance structure
interface Coin {
  coinType: string;
  coinObjectCount: number;
  totalBalance: string;
  lockedBalance: object;
}

const WalletDashboard: React.FC = () => {
  const [walletAddress, setWalletAddress] = useState<string>(process.env.PLASMO_PUBLIC_ADDRESS || "");
  const [shouldQuery, setShouldQuery] = useState<boolean>(false);

  // Validate hex input
  const validateHex = (input: string) => {
    return /^(0x)?[0-9a-fA-F]*$/.test(input);
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validateHex(value) || value === "") {
      setWalletAddress(value);
      setShouldQuery(false); // Reset query state when address changes
    }
  };

  const handleQueryWallet = () => {
    if (walletAddress.trim()) {
      setShouldQuery(true);
      console.log(`Querying wallet: ${walletAddress}`);
    }
  };

  const { data: coinsData, isLoading: coinIsLoading, error: coinError, isError: coinIsError } = useSuiClientQuery(
    'getAllBalances',
    {
      owner: walletAddress
    },
    {
      refetchInterval: 5000, // Refetch every 5 seconds
      enabled: shouldQuery && walletAddress.length > 0,
    }
  );

  if (!coinIsLoading && coinsData) console.log("Coins Data:", coinsData);
  
  const allCoins = coinsData as Coin[] | undefined;
  const coins = allCoins?.filter(coin => coin.totalBalance !== "0");

  const { data: coinDetailData, isSuccess: coinDetailIsSuccess, isPending: coinDetailIsPending, isError: coinDetailIsError }
    = useSuiClientQueries({
      queries: (coins ?? []).map((coin) => ({
        method: 'getCoinMetadata',
        params: { coinType: coin.coinType }
      })),
      combine: (result) => {
        return {
          data: result.map((res) => res.data),
          isSuccess: result.every((res) => res.isSuccess),
          isPending: result.some((res) => res.isPending),
          isError: result.some((res) => res.isError),
        };
      }
    });

  if (!coinDetailIsPending && coinDetailData) console.log("Coin Detail Data:", coinDetailData);

  // Sort coins and coinDetailData by contract hash (coinType/id) ascending
  let sortedCoins: Coin[] = [];
  let sortedCoinDetailData: any[] = [];
  if (coins && coinDetailData) {
    // Pair coins with their detail and sort by coinType/id
    const paired = coins.map((coin, idx) => ({
      coin,
      detail: coinDetailData[idx],
      sortKey: coin.coinType,
    })).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    sortedCoins = paired.map(p => p.coin);
    sortedCoinDetailData = paired.map(p => p.detail);
  } else {
    sortedCoins = coins ?? [];
    sortedCoinDetailData = coinDetailData ?? [];
  }

  const newcoins = sortedCoins;
  const newcoinDetailData = sortedCoinDetailData;

  return (
    <div className="w-fit min-w-96">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 backdrop-blur-sm bg-opacity-95">
        <div className="border-b border-gray-200 pb-3 mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Wallet Dashboard
          </h2>
        </div>

        <div className="space-y-5">
          {/* Wallet Address Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Wallet Address
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter wallet address (0x...)"
                value={walletAddress}
                onChange={handleAddressChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <button
                type="button"
                onClick={handleQueryWallet}
                disabled={!walletAddress.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Query
              </button>
            </div>
          </div>

          {/* Status Indicators */}
          {shouldQuery && (
            <div className="flex items-center gap-2 text-sm">
              {coinIsLoading ? (
                <>
                  <LoadingSpinnerIcon className="w-4 h-4 text-blue-500" />
                  <span className="text-blue-600">Loading wallet data...</span>
                </>
              ) : coinIsError ? (
                <>
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                  <span className="text-red-600">Error loading wallet data</span>
                </>
              ) : coinsData ? (
                <>
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  <span className="text-green-600">Wallet data loaded successfully</span>
                </>
              ) : null}
            </div>
          )}

          {/* Coins Section */}
          {shouldQuery && coinsData && (
            <>
              <div className="relative">
                <div className="border-t border-gray-200 my-6"></div>
                <span className="absolute top-[-12px] left-0 bg-white px-3 text-sm font-medium text-gray-500">
                  Coin Balances ({newcoins?.length || 0} tokens)
                </span>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {coinDetailIsPending ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinnerIcon className="w-6 h-6 text-blue-500 mr-2" />
                    <span className="text-gray-600">Loading coin details...</span>
                  </div>
                ) : newcoins && newcoins.length > 0 ? (
                  newcoins.map((coin, index) => {
                    const coinDetail = newcoinDetailData[index];
                    const balance = Number(coin.totalBalance) / Math.pow(10, Number(coinDetail?.decimals || 0));
                    
                    return (
                      <div key={coin.coinType} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                        <div className="flex items-center">
                          {coinDetail?.iconUrl ? (
                            <img 
                              src={coinDetail.iconUrl} 
                              alt={`${coinDetail.symbol} icon`} 
                              className="w-10 h-10 rounded-full mr-4" 
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-full mr-4 flex items-center justify-center">
                              <InformationCircleIcon className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="text-lg font-medium text-gray-800">
                              {coinDetail?.symbol || 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-500 truncate max-w-48">
                              {coin.coinType}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-800">
                            {balance.toFixed(6)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {coinDetail?.symbol || 'tokens'}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <InformationCircleIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No coins found in this wallet</p>
                  </div>
                )}
              </div>

              {/* External Wallet Button */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => window.open('https://seawallet.ai', '_blank')}
                  className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-md hover:from-cyan-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-sm"
                >
                  Open Sea Vault
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletDashboard;