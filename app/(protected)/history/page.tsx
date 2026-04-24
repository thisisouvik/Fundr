import { requireCreatorAccess } from "@/lib/auth/creator";
import { VerifyOnChain } from "@/components/ui/VerifyOnChain";


function formatXlm(amount: number) {
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} XLM`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function HistoryPage() {
  const { supabase, user }: any = await requireCreatorAccess();

  const { data: campaigns }: any = await supabase
    .from("campaigns")
    .select("id, title")
    .eq("creator_id", user.id);

  const campaignIds = (campaigns ?? []).map((campaign: any) => campaign.id);

  const { data: contributions } = campaignIds.length
    ? await supabase
        .from("contributions")
        .select("campaign_id, wallet_address, amount_xlm, tx_hash, created_at")
        .in("campaign_id", campaignIds)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false })
    : {
        data: [] as Array<{
          campaign_id: string;
          wallet_address: string;
          amount_xlm: number;
          tx_hash: string;
          created_at: string;
        }>,
      };

  const titleById = new Map<string, string>(
    (campaigns ?? []).map((campaign: any) => [campaign.id as string, campaign.title as string]),
  );

  const totalRaised = (contributions ?? []).reduce((sum: number, item: any) => {
    return sum + Number(item.amount_xlm ?? 0);
  }, 0);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-4xl font-bold">Fundraised History</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Every confirmed contribution received across your campaigns.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Total Confirmed Raised</p>
          <p className="mt-2 text-3xl font-bold">{formatXlm(totalRaised)}</p>
        </article>
        <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Total Confirmed Contributions</p>
          <p className="mt-2 text-3xl font-bold">{contributions?.length ?? 0}</p>
        </article>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--surface-soft)]">
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Campaign</th>
              <th className="px-4 py-3 font-semibold">Backer Wallet</th>
              <th className="px-4 py-3 font-semibold">Amount</th>
              <th className="px-4 py-3 font-semibold">Tx Hash</th>
              <th className="px-4 py-3 font-semibold">Verify</th>
            </tr>
          </thead>
          <tbody>
            {(contributions ?? []).length ? (
              (contributions ?? []).map((item: any) => (
                <tr key={item.tx_hash} className="border-b border-[var(--line)] last:border-b-0">
                  <td className="px-4 py-3">{formatDate(item.created_at)}</td>
                  <td className="px-4 py-3">{titleById.get(item.campaign_id) ?? "Untitled"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{item.wallet_address.slice(0, 8)}…{item.wallet_address.slice(-4)}</td>
                  <td className="px-4 py-3 font-semibold">{formatXlm(Number(item.amount_xlm ?? 0))}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--muted)]">{item.tx_hash.slice(0, 10)}…</td>
                  <td className="px-4 py-3">
                    <VerifyOnChain value={item.tx_hash} label="Verify ↗" />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted)]">
                  No confirmed fundraising history yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}