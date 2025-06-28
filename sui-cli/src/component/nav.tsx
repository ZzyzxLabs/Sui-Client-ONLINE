"use client";
import { ConnectButton } from "@mysten/dapp-kit";

export default function Nav() {
  return (
    <nav className="flex items-center justify-between p-4 bg-gray-800/40">
      <div className="text-shadow-blue-800 text-lg font-bold">Sui Client</div>
      <ConnectButton />
    </nav>
  );
}
