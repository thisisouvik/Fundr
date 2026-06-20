"use client";

import { useState } from "react";
import { Address, Contract, nativeToScVal } from "@stellar/stellar-sdk";
import { VerifyOnChain } from "@/components/ui/VerifyOnChain";
import { useSorobanIntegration } from "@/hooks/useSorobanIntegration";

interface MilestoneVotePanelProps {
  contractId: string;
  canVote: boolean;
}

export function MilestoneVotePanel({ contractId, canVote }: MilestoneVotePanelProps) {
  const { submitTransaction, isSubmitting } = useSorobanIntegration();
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleVote = async (milestone: 1 | 2, approve: boolean) => {
    try {
      const contract = new Contract(contractId);
      const { hash } = await submitTransaction({
        buildOperations: (walletAddress) => [
          contract.call(
            "vote_milestone",
            new Address(walletAddress).toScVal(),
            nativeToScVal(milestone, { type: "u32" }),
            nativeToScVal(approve),
          ),
        ],
      });

      setTxHash(hash);
    } catch (err: any) {
      console.error(err);
      alert("Milestone vote failed: " + (err.message || "Unknown error"));
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Milestone Voting</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Backers can vote after the campaign goal is met and the deadline has passed.
          </p>
        </div>
        {txHash ? <VerifyOnChain value={txHash} label="Verify" variant="pill" /> : null}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {[1, 2].map((milestone) => (
          <div key={milestone} className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
            <p className="font-semibold">Milestone {milestone}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!canVote || isSubmitting}
                onClick={() => handleVote(milestone as 1 | 2, true)}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={!canVote || isSubmitting}
                onClick={() => handleVote(milestone as 1 | 2, false)}
                className="rounded-xl border border-red-300 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {!canVote ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
          Voting opens only after the campaign has ended successfully.
        </p>
      ) : null}
    </section>
  );
}
