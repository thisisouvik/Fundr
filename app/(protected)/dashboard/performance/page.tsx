import { CampaignPerformanceCards } from "@/components/dashboard/CampaignPerformanceCards";
import { requireCreatorAccess } from "@/lib/auth/creator";
import type { CampaignRow, ContributionRow } from "@/types/supabase";

function toDisplayName(walletAddress: string) {
  if (walletAddress.length <= 10) {
    return walletAddress;
  }

  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
}

export default async function CampaignPerformancePage() {
  const { supabase, user, isAdmin } = await requireCreatorAccess();
  const userId = user.id;
  const isAdminPanelView = isAdmin;

  if (isAdminPanelView) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Campaign Performance</h1>
        <p className="text-sm text-[var(--muted)]">
          This view is available from creator accounts to track deployed campaign performance.
        </p>
      </div>
    );
  }

  const { data: campaignsData } = await supabase
    .from("campaigns")
    .select("id, title, status, goal_xlm, views_count")
    .eq("creator_id", userId)
    .neq("status", "draft")
    .order("created_at", { ascending: false });

  const campaigns = campaignsData as Array<
    Pick<CampaignRow, "id" | "title" | "status" | "goal_xlm" | "views_count">
  > | null;
  const campaignIds = (campaigns ?? []).map((campaign) => campaign.id);

  const { data: contributionsData } = campaignIds.length
    ? await supabase
        .from("contributions")
        .select("campaign_id, amount_xlm, wallet_address, is_anonymous, donor_name, status")
        .in("campaign_id", campaignIds)
        .eq("status", "confirmed")
    : { data: [] as Array<Pick<ContributionRow, "campaign_id" | "amount_xlm" | "wallet_address" | "is_anonymous" | "donor_name" | "status">> };

  const contributions = contributionsData as Array<
    Pick<
      ContributionRow,
      "campaign_id" | "amount_xlm" | "wallet_address" | "is_anonymous" | "donor_name" | "status"
    >
  >;

  const performanceRows = (campaigns ?? []).map((campaign) => {
    const rows = contributions.filter((contribution) => contribution.campaign_id === campaign.id);
    const donationCount = rows.length;
    const anonymousDonationCount = rows.filter((row) => row.is_anonymous).length;
    const uniqueDonorCount = new Set(rows.map((row) => row.wallet_address)).size;
    const totalRaisedXlm = rows.reduce((sum, row) => sum + Number(row.amount_xlm ?? 0), 0);

    const donorTotals = rows.reduce<Record<string, { label: string; totalXlm: number }>>((acc, row) => {
      if (row.is_anonymous) {
        return acc;
      }

      const donorKey = row.wallet_address;
      const donorLabel = row.donor_name?.trim() || toDisplayName(row.wallet_address);
      acc[donorKey] = {
        label: donorLabel,
        totalXlm: (acc[donorKey]?.totalXlm ?? 0) + Number(row.amount_xlm ?? 0),
      };
      return acc;
    }, {});

    const topDonors = Object.values(donorTotals)
      .sort((a, b) => b.totalXlm - a.totalXlm)
      .slice(0, 5);

    return {
      id: campaign.id,
      title: campaign.title,
      status: campaign.status,
      viewsCount: Number(campaign.views_count ?? 0),
      donationCount,
      anonymousDonationCount,
      uniqueDonorCount,
      totalRaisedXlm,
      goalXlm: Number(campaign.goal_xlm ?? 0),
      topDonors,
    };
  });

  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-bold">Campaign Performance</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Click a deployed campaign card to view detailed performance metrics.
        </p>
      </section>

      <CampaignPerformanceCards rows={performanceRows} />
    </div>
  );
}