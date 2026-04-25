import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { VerifyOnChain } from "@/components/ui/VerifyOnChain";
import { WithdrawButton } from "@/components/campaigns/WithdrawButton";

export default async function MyCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase: any = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("creator_id", user.id)
    .maybeSingle();

  if (!campaign) redirect("/my-campaigns");

  // Fetch contribution stats
  const { data: contributions } = await supabase
    .from("contributions")
    .select("amount_xlm, donor_name, is_anonymous, created_at, tx_hash, wallet_address")
    .eq("campaign_id", id)
    .eq("status", "confirmed")
    .order("created_at", { ascending: false });

  const contribs = contributions ?? [];
  const raised = contribs.reduce((s: number, c: any) => s + Number(c.amount_xlm), 0);
  const goal = Number(campaign.goal_xlm);
  const progress = Math.min((raised / goal) * 100, 100);
  const uniqueBackers = new Set(contribs.map((c: any) => c.wallet_address)).size;
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(campaign.deadline).getTime() - now) / 86_400_000)
  );
  const isExpired = daysLeft === 0;

  const imageUrl = campaign.image_url || null;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/my-campaigns"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] transition hover:text-[var(--brand)]"
      >
        ← Back to My Campaigns
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ── Left column ── */}
        <div className="space-y-6">
          {/* Hero */}
          <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={campaign.title}
                className="h-56 w-full object-cover"
              />
            )}
            <div className="p-6">
              <div className="flex flex-wrap items-start gap-3">
                <span className="rounded-full bg-[var(--brand-soft)] px-3 py-0.5 text-xs font-semibold capitalize text-[var(--brand-strong)]">
                  {campaign.category}
                </span>
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase ${
                    campaign.status === "active" && !isExpired
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {campaign.status === "active" && isExpired ? "Ended" : campaign.status}
                </span>
              </div>
              <h1 className="mt-3 text-3xl font-bold">{campaign.title}</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">{campaign.short_description}</p>
              <p className="mt-4 text-sm leading-7 text-[var(--foreground)]">
                {campaign.description}
              </p>
            </div>
          </section>

          {/* Donors table */}
          <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <h2 className="text-xl font-bold">Donor History</h2>
            {contribs.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">No contributions yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--line)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      <th className="pb-2 pr-4">Donor</th>
                      <th className="pb-2 pr-4">Amount</th>
                      <th className="pb-2 pr-4">Date</th>
                      <th className="pb-2">Tx</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {contribs.map((c: any, i: number) => (
                      <tr key={i} className="py-2">
                        <td className="py-2.5 pr-4 font-medium">
                          {c.is_anonymous ? "Anonymous" : (c.donor_name || "—")}
                        </td>
                        <td className="py-2.5 pr-4 font-semibold text-[var(--brand)]">
                          {Number(c.amount_xlm).toFixed(2)} XLM
                        </td>
                        <td className="py-2.5 pr-4 text-[var(--muted)]">
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2.5">
                          {c.tx_hash ? (
                            <VerifyOnChain value={c.tx_hash} label="Verify ↗" />
                          ) : (
                            <span className="text-[var(--muted)]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* On-chain + Withdraw */}
          {campaign.contract_address && (
            <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
              <h2 className="text-xl font-bold">On-Chain Info</h2>
              <div className="mt-3 flex flex-wrap gap-3">
                <VerifyOnChain
                  value={campaign.contract_address}
                  label="View Contract ↗"
                />
                {campaign.factory_tx_hash && (
                  <VerifyOnChain
                    value={campaign.factory_tx_hash}
                    label="View Factory Tx ↗"
                  />
                )}
              </div>
              <p className="mt-2 break-all font-mono text-[10px] text-[var(--muted)]">
                {campaign.contract_address}
              </p>
              <WithdrawButton
                contractId={campaign.contract_address}
                deadline={campaign.deadline}
              />
            </section>
          )}

          {/* Edit link */}
          <div>
            <Link
              href={`/fundraising/manage/${campaign.id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white"
            >
              ✏️ Edit Campaign Details
            </Link>
          </div>
        </div>

        {/* ── Right column: stats sidebar ── */}
        <aside className="space-y-4">
          {/* Funding progress */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
            <p className="text-sm text-[var(--muted)]">Total Raised</p>
            <p className="mt-1 text-3xl font-bold">{raised.toFixed(2)} XLM</p>
            <p className="text-xs text-[var(--muted)]">of {goal} XLM goal</p>

            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-semibold">{progress.toFixed(0)}%</span>
                <span className="text-[var(--muted)]">{(goal - raised).toFixed(2)} XLM to go</span>
              </div>
              <div className="h-3 w-full rounded-full bg-[var(--brand-soft)]">
                <div
                  className="h-3 rounded-full bg-[var(--brand)] transition-all"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="text-xs text-[var(--muted)]">Backers</p>
              <p className="mt-1 text-2xl font-bold">{uniqueBackers}</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="text-xs text-[var(--muted)]">Days Left</p>
              <p className="mt-1 text-2xl font-bold">{isExpired ? "Ended" : daysLeft}</p>
            </div>
          </div>

          {/* Deadline */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm">
            <p className="font-semibold">Campaign Deadline</p>
            <p className="mt-1 text-[var(--muted)]">
              {new Date(campaign.deadline).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          {/* Goal met banner */}
          {progress >= 100 && (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-center text-sm font-semibold text-emerald-700">
              ✓ Goal achieved!
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
