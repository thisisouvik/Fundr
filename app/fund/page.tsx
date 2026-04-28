export const dynamic = 'force-dynamic';
import { createClient } from "@/lib/supabase/server";
import WalletWidget from "@/components/wallet/WalletCard";
import { FundForm, CampaignOption } from "@/components/fund/FundForm";

export default async function FundPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const preselectedCampaign = typeof params.campaign === "string" ? params.campaign : "";

  const supabase = await createClient();

  // Fetch all active campaigns
  const { data: activeCampaigns } = await supabase
    .from("campaigns")
    .select("id, title, goal_xlm, contract_address")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const campaignsList = activeCampaigns ?? [];
  const campaignIds = campaignsList.map((c) => c.id);

  // Fetch contributions for progress
  const { data: contributions } = campaignIds.length
    ? await supabase
        .from("contributions")
        .select("campaign_id, amount_xlm")
        .in("campaign_id", campaignIds)
        .eq("status", "confirmed")
    : { data: [] };

  const raisedByCampaign = (contributions ?? []).reduce<Record<string, number>>((acc, c) => {
    acc[c.campaign_id] = (acc[c.campaign_id] ?? 0) + Number(c.amount_xlm);
    return acc;
  }, {});

  const campaigns: CampaignOption[] = campaignsList.map((c) => {
    const raised = raisedByCampaign[c.id] ?? 0;
    const goal = Number(c.goal_xlm);
    const progress = Math.min((raised / goal) * 100, 100);
    return {
      id: c.id,
      title: c.title,
      contract_address: c.contract_address,
      location: "Global",
      raised,
      progress,
      goal,
    };
  });

  const minimumAmount = 1;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <WalletWidget role="funder" serverAmount={0} />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-[26rem] bg-[radial-gradient(circle_at_top_left,_rgba(15,139,128,0.12),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(15,139,128,0.08),_transparent_34%)]" />
      <div className="pointer-events-none absolute left-0 top-24 h-64 w-64 rounded-full bg-[rgba(15,139,128,0.08)] blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-40 h-72 w-72 rounded-full bg-[rgba(15,139,128,0.06)] blur-3xl" />

      <main className="relative mx-auto w-full max-w-6xl px-4 py-10 md:px-8 md:py-14">
        <section className="max-w-4xl space-y-4">
          <p className="inline-flex rounded-full border border-[var(--brand)] bg-[var(--brand-soft)] px-4 py-1 text-sm font-medium text-[var(--brand-strong)] shadow-sm">
            Public Fund Flow
          </p>
          <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            Fund a campaign with wallet support and optional anonymity.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-[var(--muted)] md:text-lg">
            Choose a campaign, connect your wallet, and either donate anonymously or provide your name and email.
            Minimum funding amount is {minimumAmount} XLM.
          </p>
        </section>

        {campaigns.length > 0 ? (
          <FundForm campaigns={campaigns} preselectedTitle={preselectedCampaign} />
        ) : (
          <div className="mt-10 rounded-[2rem] border border-[var(--line)] bg-[rgba(255,255,255,0.92)] p-12 text-center shadow-[0_16px_40px_rgba(20,24,23,0.08)] backdrop-blur-sm">
            <h2 className="text-2xl font-bold">No active campaigns</h2>
            <p className="mt-2 text-[var(--muted)]">Check back later for new campaigns to fund.</p>
          </div>
        )}
      </main>
    </div>
  );
}
