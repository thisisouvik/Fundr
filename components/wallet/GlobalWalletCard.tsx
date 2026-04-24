import { createClient } from "@/lib/supabase/server";
import WalletCard from "@/components/wallet/WalletCard";

export async function GlobalWalletCard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const userId = user.id;
  const normalizedUserEmail = (user.email || "").trim().toLowerCase();
  const normalizedAdminEmail = (process.env.ADMIN_PANEL_EMAIL || "").trim().toLowerCase();
  const isDedicatedAdmin =
    Boolean(normalizedUserEmail) && normalizedUserEmail === normalizedAdminEmail;

  const [profileResponse, campaignsResponse] = await Promise.all([
    supabase
      .from("profiles")
      .select("total_raised_xlm, role, wallet_address")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("campaigns")
      .select("id, title, status, goal_xlm, contract_address, factory_tx_hash")
      .eq("creator_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const profile = profileResponse.data;
  const campaigns = campaignsResponse.data;

  const campaignIds = (campaigns ?? []).map((campaign) => campaign.id);

  const { data: contributions } = campaignIds.length
    ? await supabase
        .from("contributions")
        .select("campaign_id, wallet_address, amount_xlm")
        .in("campaign_id", campaignIds)
        .eq("status", "confirmed")
    : { data: [] };

  // Total funded BY this user (as a funder on other campaigns)
  const { data: myContributions } = await supabase
    .from("contributions")
    .select("amount_xlm")
    .eq("wallet_address", profile?.wallet_address ?? "")
    .eq("status", "confirmed");

  const raisedByCampaign = (contributions ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.campaign_id] = (acc[row.campaign_id] ?? 0) + Number(row.amount_xlm ?? 0);
    return acc;
  }, {});

  const totalRaised = Object.values(raisedByCampaign).reduce(
    (sum, amount) => sum + amount,
    0,
  );

  // Sum of what this user has personally contributed (as a funder)
  const totalFunded = (myContributions ?? []).reduce(
    (sum, row) => sum + Number(row.amount_xlm ?? 0),
    0,
  );

  const isAdminPanelView = isDedicatedAdmin || profile?.role === "admin";
  const isFundraiser = profile?.role === "creator" || isAdminPanelView;
  const walletRole: "funder" | "fundraiser" | "admin" = isAdminPanelView
    ? "admin"
    : isFundraiser
      ? "fundraiser"
      : "funder";

  const walletAmount = isAdminPanelView
    ? totalRaised          // admin: platform total
    : isFundraiser
      ? totalRaised        // fundraiser: total received across their campaigns
      : totalFunded;       // funder: total they've contributed

  return (
    <WalletCard
      role={walletRole}
      serverAmount={walletAmount}
      savedWallet={profile?.wallet_address ?? null}
    />
  );
}
