"use client";
import { ConnectButton } from "@mysten/dapp-kit";

interface NavProps {
  movefn: () => void;
  walletfn: () => void;
  txbfn: () => void;
}

export default function Nav({ movefn, walletfn, txbfn }: NavProps) {
  return (
    <nav className="flex items-center justify-between p-4 bg-gray-800/40">
      <div className="text-shadow-blue-800 text-lg font-bold">Sui Client</div>
      <p onClick={movefn}>move function call</p>
      <p onClick={walletfn}>wallet view</p>
      <p onClick={txbfn}>simple transaction (WIP)</p>
      <ConnectButton />
    </nav>
  );
}
