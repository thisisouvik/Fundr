"use client";

import { useState } from "react";
import { DonationModal } from "@/components/campaigns/DonationModal";
import type { CampaignRow } from "@/types/supabase";

interface DonationPanelProps {
  campaign: CampaignRow;
  raised: number;
  uniqueBackers: number;
  progress: number;
  daysLeft: number;
}

export function DonationPanel({
  campaign,
  raised,
  uniqueBackers,
  progress,
  daysLeft,
}: DonationPanelProps) {
  const [showDonationModal, setShowDonationModal] = useState(false);
  const isActive = campaign.status === "active" && daysLeft > 0;

  return (
    <>
      <div className="space-y-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-lg">
        {/* Stats */}
        <div className="space-y-4 border-b border-[var(--line)] pb-4">
          <div>
            <p className="text-sm text-[var(--muted)]">Raised</p>
            <p className="text-3xl font-bold">{raised.toFixed(2)} XLM</p>
            <p className="text-xs text-[var(--muted)]">of {campaign.goal_xlm} XLM goal</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[var(--muted)]">Backers</p>
              <p className="text-2xl font-bold">{uniqueBackers}</p>
            </div>
            <div>
              <p className="text-sm text-[var(--muted)]">Days left</p>
              <p className="text-2xl font-bold">{daysLeft > 0 ? daysLeft : "Ended"}</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <p className="font-semibold">{progress.toFixed(0)}% funded</p>
            <p className="text-[var(--muted)]">{(Number(campaign.goal_xlm) - raised).toFixed(2)} XLM to go</p>
          </div>
          <div className="h-3 w-full rounded-full bg-[var(--brand-soft)]">
            <div
              className="h-3 rounded-full bg-[var(--brand)] transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Donation Button */}
        {isActive ? (
          <button
            onClick={() => setShowDonationModal(true)}
            className="w-full rounded-xl bg-[var(--brand)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
          >
            Fund This Campaign
          </button>
        ) : (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] py-3 text-center text-sm text-[var(--muted)]">
            Campaign is no longer accepting funds
          </div>
        )}

        {/* Goal Met Banner */}
        {progress >= 100 && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-center text-sm font-semibold text-emerald-700">
            ✓ Goal achieved!
          </div>
        )}
      </div>

      {/* Donation Modal */}
      {showDonationModal && (
        <DonationModal campaign={campaign} onClose={() => setShowDonationModal(false)} />
      )}
    </>
  );
}
