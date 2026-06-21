"use client";

import { useState } from "react";
import { Contract } from "@stellar/stellar-sdk";
import { VerifyOnChain } from "@/components/ui/VerifyOnChain";
import { useSorobanIntegration } from "@/hooks/useSorobanIntegration";

interface WithdrawButtonProps {
  contractId: string;
  deadline: string;
}

export function WithdrawButton({ contractId, deadline }: WithdrawButtonProps) {
  const { submitTransaction, isSubmitting } = useSorobanIntegration();
  const [txHash, setTxHash] = useState<string | null>(null);

  const isPastDeadline = new Date().getTime() > new Date(deadline).getTime();

  const handleRelease = async () => {
    try {
      const contract = new Contract(contractId);

      const { hash, result } = await submitTransaction({
        buildOperations: () => [contract.call("attempt_release_milestone_funds")],
      });

      setTxHash(hash);
      if (Number(result ?? 0) === 0) {
        alert("Milestone release failed, and the creator reputation was penalized on-chain.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Milestone release failed: " + (err.message || "Unknown error"));
    }
  };

  if (txHash) {
    return (
      <div className="mt-6 rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-lg font-bold text-white shadow">
            OK
          </span>
          <div>
            <p className="text-lg font-bold text-emerald-800">Milestone Funds Released</p>
            <p className="text-xs text-emerald-600">The next approved tranche has been transferred to your wallet.</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-white/70 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-emerald-800">Transaction ID</p>
            <p className="mt-0.5 truncate font-mono text-[10px] text-emerald-600">{txHash}</p>
          </div>
          <VerifyOnChain value={txHash} label="Verify" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
      <h2 className="text-xl font-bold text-emerald-800">Release Milestone Funds</h2>
      <p className="mt-2 text-sm text-emerald-700/90">
        Once the campaign succeeds, the first release sends 30%. Later releases require backer-approved
        milestone votes for 35% and the remaining 35%.
      </p>

      {!isPastDeadline && (
        <p className="mt-3 text-xs font-semibold text-amber-700">
          Note: Your campaign deadline has not passed yet. The smart contract will reject releases.
        </p>
      )}

      <div className="mt-4">
        <button
          onClick={handleRelease}
          disabled={isSubmitting}
          className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSubmitting ? "Processing..." : "Release Next Tranche"}
        </button>
      </div>
    </div>
  );
}
