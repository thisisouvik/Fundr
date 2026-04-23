"use client";

import { useState } from "react";
import { DonationReceipt } from "@/components/campaigns/DonationReceipt";
import type { CampaignRow } from "@/types/supabase";

interface DonationModalProps {
  campaign: CampaignRow;
  onClose: () => void;
}

export function DonationModal({ campaign, onClose }: DonationModalProps) {
  const [step, setStep] = useState<"choice" | "form" | "confirm" | "success">("choice");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [amount, setAmount] = useState("1");
  const [donorName, setDonorName] = useState("");
  const [donorMessage, setDonorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleAnonymousDonate = () => {
    setIsAnonymous(true);
    setStep("form");
  };

  const handleNamedDonate = () => {
    setIsAnonymous(false);
    setStep("form");
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || Number(amount) < 1) {
      alert("Amount must be at least 1 XLM");
      return;
    }

    if (!isAnonymous && !donorName.trim()) {
      alert("Please enter your name");
      return;
    }

    setStep("confirm");
  };

  const handleConfirmDonate = async () => {
    setIsSubmitting(true);
    
    try {
      // This would normally call a server action to:
      // 1. Process the Stellar payment
      // 2. Store the contribution in Supabase
      // For now, we'll show a mock success
      
      const mockTxHash = `${Math.random().toString(16).slice(2)}_${Date.now()}`;
      setTxHash(mockTxHash);
      setStep("success");
    } catch {
      alert("Donation failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-6 shadow-xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ✕
        </button>

        {step === "choice" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">How would you like to donate?</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">Choose to donate anonymously or with your name.</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleAnonymousDonate}
                className="w-full rounded-xl border-2 border-[var(--brand)] bg-[var(--brand)]/10 py-4 text-left transition hover:bg-[var(--brand)]/20"
              >
                <p className="font-semibold">Donate Anonymously</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Your name won&apos;t be shown to the campaign creator</p>
              </button>

              <button
                onClick={handleNamedDonate}
                className="w-full rounded-xl border-2 border-[var(--line)] py-4 text-left transition hover:border-[var(--brand)] hover:bg-[var(--surface-soft)]"
              >
                <p className="font-semibold">Donate with Your Name</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Your name will be visible to other donors</p>
              </button>
            </div>
          </div>
        )}

        {step === "form" && (
          <form onSubmit={handleFormSubmit} className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold">
                {isAnonymous ? "Anonymous Donation" : "Named Donation"}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Campaign: <span className="font-semibold">{campaign.title}</span>
              </p>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
              <label className="block text-sm font-medium mb-2">Amount (XLM)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 py-2 text-sm outline-none"
                required
              />
            </div>

            {!isAnonymous && (
              <>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                  <label className="block text-sm font-medium mb-2">Your Name</label>
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 py-2 text-sm outline-none"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                  <label className="block text-sm font-medium mb-2">Message (Optional)</label>
                  <textarea
                    value={donorMessage}
                    onChange={(e) => setDonorMessage(e.target.value)}
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--background)] px-3 py-2 text-sm outline-none"
                    placeholder="Leave a message of support..."
                    rows={3}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <button
                type="submit"
                className="w-full rounded-xl bg-[var(--brand)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
              >
                Continue
              </button>
              <button
                type="button"
                onClick={() => setStep("choice")}
                className="w-full rounded-xl border border-[var(--line)] py-2 text-sm font-semibold transition hover:bg-[var(--surface-soft)]"
              >
                Back
              </button>
            </div>
          </form>
        )}

        {step === "confirm" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Confirm Donation</h2>
              <p className="text-sm text-[var(--muted)]">Review your donation details before proceeding.</p>
            </div>

            <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
              <div className="flex items-center justify-between text-sm">
                <p className="text-[var(--muted)]">Campaign</p>
                <p className="font-semibold">{campaign.title}</p>
              </div>
              <div className="border-t border-[var(--line)]" />
              <div className="flex items-center justify-between text-sm">
                <p className="text-[var(--muted)]">Amount</p>
                <p className="font-semibold">{amount} XLM</p>
              </div>
              <div className="border-t border-[var(--line)]" />
              <div className="flex items-center justify-between text-sm">
                <p className="text-[var(--muted)]">Visibility</p>
                <p className="font-semibold">{isAnonymous ? "Anonymous" : donorName}</p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleConfirmDonate}
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[var(--brand)] py-3 text-sm font-semibold text-white transition disabled:opacity-50 hover:bg-[var(--brand-strong)]"
              >
                {isSubmitting ? "Processing..." : "Complete Donation"}
              </button>
              <button
                onClick={() => setStep("form")}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-[var(--line)] py-2 text-sm font-semibold transition disabled:opacity-50 hover:bg-[var(--surface-soft)]"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {step === "success" && txHash && (
          <DonationReceipt
            campaign={campaign}
            amount={amount}
            isAnonymous={isAnonymous}
            donorName={donorName}
            txHash={txHash}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
