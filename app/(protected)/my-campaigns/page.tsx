export const dynamic = 'force-dynamic';
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function MyCampaignsPage() {
  const supabase: any = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch creator's campaigns with contribution totals
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, title, slug, status, goal_xlm, deadline, image_url, short_description, category, contract_address")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  const campaignList = campaigns ?? [];
  const campaignIds = campaignList.map((c: any) => c.id);

  // Fetch raised amounts per campaign
  const { data: contributions } = campaignIds.length
    ? await supabase
        .from("contributions")
        .select("campaign_id, amount_xlm")
        .in("campaign_id", campaignIds)
        .eq("status", "confirmed")
    : { data: [] };

  const raisedMap = (contributions ?? []).reduce((acc: Record<string, number>, c: any) => {
    acc[c.campaign_id] = (acc[c.campaign_id] ?? 0) + Number(c.amount_xlm);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8">
      <section className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Manage Campaigns</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            View, manage, and track all your fundraising campaigns.
          </p>
        </div>
        <Link
          href="/fundraising"
          className="rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
        >
          + New Campaign
        </Link>
      </section>

      {campaignList.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-12 text-center">
          <p className="text-2xl font-bold">No campaigns yet</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Start your first campaign to appear here.
          </p>
          <Link
            href="/fundraising"
            className="mt-6 inline-flex rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
          >
            Create Campaign
          </Link>
        </section>
      ) : (
        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {campaignList.map((c: any) => {
            const raised = raisedMap[c.id] ?? 0;
            const goal = Number(c.goal_xlm);
            const progress = Math.min((raised / goal) * 100, 100);
            const isExpired = new Date(c.deadline) < new Date();
            const statusColor =
              c.status === "active" && !isExpired
                ? "bg-emerald-100 text-emerald-700"
                : c.status === "active" && isExpired
                  ? "bg-amber-100 text-amber-700"
                  : "bg-zinc-100 text-zinc-500";
            const statusLabel =
              c.status === "active" && !isExpired
                ? "Active"
                : c.status === "active" && isExpired
                  ? "Ended"
                  : c.status;

            return (
              <Link
                key={c.id}
                href={`/my-campaigns/${c.id}`}
                className="group flex flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm transition hover:border-[var(--brand)] hover:shadow-md overflow-hidden"
              >
                {/* Thumbnail */}
                <div className="relative h-40 w-full bg-[var(--surface-soft)]">
                  {c.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.image_url}
                      alt={c.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl text-[var(--muted)]">
                      📋
                    </div>
                  )}
                  <span
                    className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusColor}`}
                  >
                    {statusLabel}
                  </span>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                      {c.category}
                    </p>
                    <h2 className="mt-1 text-base font-bold leading-snug group-hover:text-[var(--brand)] transition-colors line-clamp-2">
                      {c.title}
                    </h2>
                    <p className="mt-1 text-xs text-[var(--muted)] line-clamp-2">
                      {c.short_description}
                    </p>
                  </div>

                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">{progress.toFixed(0)}% funded</span>
                      <span className="text-[var(--muted)]">
                        {raised.toFixed(2)} / {goal} XLM
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[var(--brand-soft)]">
                      <div
                        className="h-2 rounded-full bg-[var(--brand)] transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-auto flex items-center justify-between border-t border-[var(--line)] pt-3 text-xs text-[var(--muted)]">
                    <span>Deadline: {new Date(c.deadline).toLocaleDateString()}</span>
                    <span className="font-semibold text-[var(--brand)]">View details →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
