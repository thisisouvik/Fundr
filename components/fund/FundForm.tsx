"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Contract, Address, nativeToScVal } from "@stellar/stellar-sdk";
import { saveContribution } from "@/app/campaigns/[slug]/actions";
import { VerifyOnChain } from "@/components/ui/VerifyOnChain";
import { useSorobanIntegration } from "@/hooks/useSorobanIntegration";

export interface CampaignOption {
  id: string;
  title: string;
  contract_address?: string | null;
  location: string;
  raised: number;
  progress: number;
  goal: number;
}

interface FundFormProps {
  campaigns: CampaignOption[];
  preselectedTitle?: string;
}

export function FundForm({ campaigns, preselectedTitle }: FundFormProps) {
  const [selectedCampaign, setSelectedCampaign] = useState(
    preselectedTitle || campaigns[0]?.title || "",
  );
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [fundAmount, setFundAmount] = useState("1");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const { submitTransaction, isSubmitting } = useSorobanIntegration();
  const [txHash, setTxHash] = useState<string | null>(null);

  const minimumAmount = 1;
  const requiresIdentity = !isAnonymous;

  const selectedCampaignMeta = useMemo(() => {
    return campaigns.find((campaign) => campaign.title === selectedCampaign) || campaigns[0];
  }, [selectedCampaign, campaigns]);

  const selectedCampaignLabel = selectedCampaign || "Choose a campaign";

  const handleContinue = async () => {
    if (!selectedCampaignMeta || !selectedCampaignMeta.contract_address) {
      alert("Selected campaign does not have a valid smart contract address.");
      return;
    }

    if (!fundAmount || Number(fundAmount) < minimumAmount) {
      alert(`Amount must be at least ${minimumAmount} XLM`);
      return;
    }

    if (!isAnonymous && !donorName.trim()) {
      alert("Please enter your name");
      return;
    }

    try {
      const contract = new Contract(selectedCampaignMeta.contract_address);
      const amountStroops = BigInt(Math.round(Number(fundAmount) * 10_000_000));

      const { hash, walletAddress: donorPubKey } = await submitTransaction({
        buildOperations: (walletAddress) => {
          return [
            contract.call(
              "pledge",
              new Address(walletAddress).toScVal(),
              nativeToScVal(amountStroops, { type: "i128" })
            )
          ];
        }
      });

      await saveContribution({
        campaign_id: selectedCampaignMeta.id,
        wallet_address: donorPubKey,
        amount_xlm: Number(fundAmount),
        donor_name: isAnonymous ? undefined : donorName,
        donor_message: undefined, // Message not supported in this form
        is_anonymous: isAnonymous,
        tx_hash: hash,
      });

      setTxHash(hash);
      alert("Donation successful! Thank you for your contribution.");
      setFundAmount("1");
    } catch (err: any) {
      console.error(err);
      alert("Donation failed: " + (err.message || "Unknown error"));
    }
  };

  return (
    <section className="mt-10 grid gap-6 lg:grid-cols-[1.45fr_1fr]">
      <form className="rounded-[2rem] border border-[var(--line)] bg-[rgba(255,255,255,0.92)] p-5 shadow-[0_16px_40px_rgba(20,24,23,0.08)] backdrop-blur-sm md:p-6">
        <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight md:text-[1.75rem]">Fund a campaign</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Make sure your wallet is connected via the widget above, or continue anonymously.</p>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Campaign</span>
            <select
              value={selectedCampaign}
              onChange={(event) => setSelectedCampaign(event.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand)] focus:bg-white"
            >
              <option value="">Select a campaign</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.title}>
                  {campaign.title}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4 transition hover:border-[rgba(15,139,128,0.35)]">
            <label className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Donate anonymously</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Hide your personal details from the campaign owner.</p>
              </div>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(event) => setIsAnonymous(event.target.checked)}
                className="mt-1 h-5 w-5 accent-[var(--brand)]"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Amount (XLM)</span>
              <input
                type="number"
                min={minimumAmount}
                step="0.01"
                value={fundAmount}
                onChange={(event) => setFundAmount(event.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand)] focus:bg-white"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Minimum value</span>
              <input
                type="text"
                value={`${minimumAmount} XLM`}
                readOnly
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted)] outline-none"
              />
            </label>
          </div>

          {requiresIdentity ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Full Name</span>
                <input
                  type="text"
                  required
                  value={donorName}
                  onChange={(event) => setDonorName(event.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand)] focus:bg-white"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Email Address</span>
                <input
                  type="email"
                  required
                  value={donorEmail}
                  onChange={(event) => setDonorEmail(event.target.value)}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm outline-none transition focus:border-[var(--brand)] focus:bg-white"
                />
              </label>
            </div>
          ) : (
            <p className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted)]">
              Anonymous donations skip the name and email fields.
            </p>
          )}

          <div className="space-y-4">
            {selectedCampaignMeta && selectedCampaignMeta.progress >= 100 ? (
              <div className="w-full rounded-xl bg-amber-50 border border-amber-200 px-4 py-3.5 text-center text-sm font-semibold text-amber-700">
                This campaign is fully funded! No further donations are accepted.
              </div>
            ) : (
              <button
                type="button"
                onClick={handleContinue}
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[var(--brand)] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,139,128,0.22)] transition hover:bg-[var(--brand-strong)] disabled:opacity-60"
              >
                {isSubmitting ? "Processing Transaction..." : "Continue to Donate"}
              </button>
            )}
            
            {txHash && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3">
                <span className="text-sm font-semibold text-emerald-800">Success!</span>
                <VerifyOnChain value={txHash} label="Verify Transaction ↗" />
              </div>
            )}
          </div>
        </div>
      </form>

      <aside className="space-y-4 rounded-[2rem] border border-[var(--line)] bg-[rgba(255,255,255,0.92)] p-5 shadow-[0_16px_40px_rgba(20,24,23,0.08)] backdrop-blur-sm md:p-6">
        <h2 className="text-2xl font-bold tracking-tight">Current setup</h2>
        <p className="text-sm leading-6 text-[var(--muted)]">
          Campaigns are created in the protected fundraiser portal. Donations happen here on the public Fund page.
        </p>

        <div className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
          <div>
            <p className="text-sm font-semibold">Selected campaign</p>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{selectedCampaignLabel}</p>
          </div>

          {selectedCampaignMeta ? (
            <div className="rounded-xl border border-[var(--line)] bg-white/60 p-3 text-xs text-[var(--muted)]">
              <p className="font-semibold text-[var(--foreground)]">Campaign preview</p>
              <p className="mt-1">{selectedCampaignMeta.location}</p>
              <p className="mt-1">Raised {selectedCampaignMeta.raised.toFixed(2)} XLM ({selectedCampaignMeta.progress.toFixed(0)}% funded)</p>
            </div>
          ) : null}
        </div>

        <div className="space-y-1 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
          <p className="text-sm font-semibold">Anonymous mode</p>
          <p className="text-sm text-[var(--muted)]">{isAnonymous ? "Enabled" : "Disabled"}</p>
        </div>

        <div className="space-y-1 rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
          <p className="text-sm font-semibold">Next step</p>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Smart contract execution and payment confirmation will come after the admin and monitoring layer.
          </p>
        </div>

        <Link
          href="/fundraising"
          className="block rounded-xl border border-[var(--brand)] px-4 py-3 text-center text-sm font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white"
        >
          Go to Campaign Creation
        </Link>
      </aside>
    </section>
  );
}
