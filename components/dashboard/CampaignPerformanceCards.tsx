"use client";

import { useMemo, useState } from "react";

interface TopDonor {
  label: string;
  totalXlm: number;
}

interface CampaignPerformanceRow {
  id: string;
  title: string;
  status: string;
  viewsCount: number;
  donationCount: number;
  anonymousDonationCount: number;
  uniqueDonorCount: number;
  totalRaisedXlm: number;
  goalXlm: number;
  topDonors: TopDonor[];
}

interface CampaignPerformanceCardsProps {
  rows: CampaignPerformanceRow[];
}

function formatXlm(amount: number) {
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} XLM`;
}

function formatPercent(value: number) {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

export function CampaignPerformanceCards({ rows }: CampaignPerformanceCardsProps) {
  const [selectedCampaignId, setSelectedCampaignId] = useState(rows[0]?.id ?? "");

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedCampaignId) ?? null,
    [rows, selectedCampaignId],
  );

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-6 text-center">
        <p className="text-base font-semibold">No deployed campaigns yet</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Campaign performance becomes available after you publish a campaign.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => {
          const isSelected = row.id === selectedCampaignId;
          const cardClass = isSelected
            ? "border-[var(--brand)] bg-[var(--brand)]/10"
            : "border-[var(--line)] bg-[var(--surface)] hover:border-[var(--brand)]/50";

          return (
            <button
              type="button"
              key={row.id}
              onClick={() => setSelectedCampaignId(row.id)}
              className={`rounded-2xl border p-5 text-left transition ${cardClass}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{row.status}</p>
              <p className="mt-2 line-clamp-2 text-lg font-bold">{row.title}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[var(--muted)]">Clicks</p>
                  <p className="font-semibold">{row.viewsCount}</p>
                </div>
                <div>
                  <p className="text-[var(--muted)]">Donations</p>
                  <p className="font-semibold">{row.donationCount}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selected ? (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
          <h2 className="text-2xl font-bold">{selected.title}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Detailed performance for this deployed campaign.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-3">
              <p className="text-xs text-[var(--muted)]">Total Clicks</p>
              <p className="mt-1 text-xl font-bold">{selected.viewsCount}</p>
            </article>
            <article className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-3">
              <p className="text-xs text-[var(--muted)]">Donations Received</p>
              <p className="mt-1 text-xl font-bold">{selected.donationCount}</p>
            </article>
            <article className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-3">
              <p className="text-xs text-[var(--muted)]">Anonymous Donations</p>
              <p className="mt-1 text-xl font-bold">{selected.anonymousDonationCount}</p>
            </article>
            <article className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-3">
              <p className="text-xs text-[var(--muted)]">Conversion Rate</p>
              <p className="mt-1 text-xl font-bold">
                {formatPercent(
                  selected.viewsCount > 0 ? (selected.donationCount / selected.viewsCount) * 100 : 0,
                )}
              </p>
            </article>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-xl border border-[var(--line)] p-3">
              <p className="text-xs text-[var(--muted)]">Total Raised</p>
              <p className="mt-1 text-lg font-bold">{formatXlm(selected.totalRaisedXlm)}</p>
            </article>
            <article className="rounded-xl border border-[var(--line)] p-3">
              <p className="text-xs text-[var(--muted)]">Goal</p>
              <p className="mt-1 text-lg font-bold">{formatXlm(selected.goalXlm)}</p>
            </article>
            <article className="rounded-xl border border-[var(--line)] p-3">
              <p className="text-xs text-[var(--muted)]">Unique Donors</p>
              <p className="mt-1 text-lg font-bold">{selected.uniqueDonorCount}</p>
            </article>
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-bold">Top Donors (Top 5)</h3>
            {selected.topDonors.length ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-[var(--line)]">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--line)] bg-[var(--surface-soft)]">
                      <th className="px-3 py-2 font-semibold">Donor</th>
                      <th className="px-3 py-2 font-semibold">Total Donated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.topDonors.map((donor) => (
                      <tr key={donor.label} className="border-b border-[var(--line)] last:border-none">
                        <td className="px-3 py-2">{donor.label}</td>
                        <td className="px-3 py-2 font-semibold">{formatXlm(donor.totalXlm)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--muted)]">No named donors yet.</p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}