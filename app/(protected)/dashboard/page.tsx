import Link from "next/link";
import { CampaignTable } from "@/components/dashboard/CampaignTable";
import { StatCard } from "@/components/dashboard/StatCard";
import { createClient } from "@/lib/supabase/server";
import type { CampaignRow, ProfileRow } from "@/types/supabase";

function formatXlm(amount: number) {
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} XLM`;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id;
  const normalizedUserEmail = (user?.email || "").trim().toLowerCase();
  const normalizedAdminEmail = (process.env.ADMIN_PANEL_EMAIL || "").trim().toLowerCase();
  const isDedicatedAdmin =
    Boolean(normalizedUserEmail) && normalizedUserEmail === normalizedAdminEmail;

  const [profileResponse, campaignsResponse] = await Promise.all([
    supabase
      .from("profiles")
      .select("total_raised_xlm, role")
      .eq("id", userId ?? "")
      .maybeSingle(),
    supabase
      .from("campaigns")
      .select("id, title, status, goal_xlm")
      .eq("creator_id", userId ?? "")
      .order("created_at", { ascending: false }),
  ]);

  const profile = profileResponse.data as Pick<ProfileRow, "role" | "total_raised_xlm"> | null;
  const campaigns = campaignsResponse.data as Array<
    Pick<CampaignRow, "id" | "title" | "status" | "goal_xlm">
  > | null;

  const campaignIds = (campaigns ?? []).map((campaign) => campaign.id);

  const { data: contributions } = campaignIds.length
    ? await supabase
        .from("contributions")
        .select("campaign_id, wallet_address, amount_xlm")
        .in("campaign_id", campaignIds)
        .eq("status", "confirmed")
    : { data: [] as Array<{ campaign_id: string; wallet_address: string; amount_xlm: number }> };

  const uniqueBackers = new Set((contributions ?? []).map((row) => row.wallet_address)).size;
  const activeCampaigns = (campaigns ?? []).filter((campaign) => campaign.status === "active").length;
  const pendingWithdrawals = (campaigns ?? []).filter(
    (campaign) => campaign.status === "successful",
  ).length;

  const raisedByCampaign = (contributions ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.campaign_id] = (acc[row.campaign_id] ?? 0) + Number(row.amount_xlm ?? 0);
    return acc;
  }, {});

  const totalRaised = Object.values(raisedByCampaign).reduce(
    (sum, amount) => sum + amount,
    0,
  );

  const campaignRows = (campaigns ?? []).map((campaign) => ({
    id: campaign.id,
    title: campaign.title,
    status: campaign.status,
    raised: formatXlm(raisedByCampaign[campaign.id] ?? 0),
    goal: formatXlm(Number(campaign.goal_xlm ?? 0)),
  }));

  const roleLabel = profile?.role ? `${profile.role} account` : "creator account";

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Creator Dashboard</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Track campaign performance and manage fundraising activity from your {roleLabel}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/fundraising"
            className="rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
          >
            Create Campaign
          </Link>
          {isDedicatedAdmin ? (
            <Link
              href="/admin"
              className="rounded-full border border-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white"
            >
              Admin Panel
            </Link>
          ) : null}
          <Link
            href="/settings"
            className="rounded-full border border-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white"
          >
            Profile and Settings
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Raised"
          value={formatXlm(totalRaised)}
          helper="Across all confirmed contributions"
        />
        <StatCard label="Total Backers" value={`${uniqueBackers}`} helper="Unique supporters" />
        <StatCard
          label="Active Campaigns"
          value={`${activeCampaigns}`}
          helper="Currently accepting funds"
        />
        <StatCard
          label="Pending Withdrawals"
          value={`${pendingWithdrawals}`}
          helper="Successful campaigns pending payout"
        />
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Your Campaigns</h2>
          <Link
            href="/fundraising"
            className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            + New Campaign
          </Link>
        </div>

        {campaignRows.length ? (
          <CampaignTable rows={campaignRows} />
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-6 text-center">
            <p className="text-base font-semibold">No campaigns created yet</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Start your first fundraiser by creating a campaign draft.
            </p>
            <Link
              href="/fundraising"
              className="mt-4 inline-flex rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
            >
              Create Your First Campaign
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
