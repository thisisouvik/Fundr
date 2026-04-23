import { createClient } from "@/lib/supabase/server";

interface RecentDonorsProps {
  campaignId: string;
}

export async function RecentDonors({ campaignId }: RecentDonorsProps) {
  const supabase = await createClient();

  const { data: donors = [] } = await supabase
    .from("contributions")
    .select("donor_name, is_anonymous, created_at")
    .eq("campaign_id", campaignId)
    .eq("status", "confirmed")
    .order("created_at", { ascending: false })
    .limit(5);
  const recentDonors = donors ?? [];

  if (recentDonors.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
        <h3 className="text-lg font-bold">Recent Supporters</h3>
        <p className="mt-3 text-sm text-[var(--muted)]">Be the first to support this campaign!</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
      <h3 className="text-lg font-bold">Recent Supporters</h3>
      <p className="mt-1 text-xs text-[var(--muted)]">Last {recentDonors.length} donors</p>

      <div className="mt-4 space-y-3">
        {recentDonors.map((donor, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-[var(--brand-soft)]" />
              <p className="font-semibold">
                {donor.is_anonymous ? "Anonymous Supporter" : donor.donor_name || "Supporter"}
              </p>
            </div>
            <p className="text-xs text-[var(--muted)]">
              {new Date(donor.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-[var(--muted)]">
        Amounts are hidden to protect donor privacy. Only the campaign creator can see contribution details.
      </p>
    </div>
  );
}
