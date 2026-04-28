export const dynamic = 'force-dynamic';
import Link from "next/link";
import { requireAdminPanelAccess } from "@/lib/auth/admin";

export default async function AdminPanelPage() {
  await requireAdminPanelAccess();

  const { createClient } = await import("@supabase/supabase-js");
  const serviceRoleClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [{ count: pendingKycCount }, { count: flaggedCampaignCount }, { count: campaignCount }] =
    await Promise.all([
      serviceRoleClient
        .from("fundraiser_kyc")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      serviceRoleClient
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("is_flagged", true),
      serviceRoleClient.from("campaigns").select("id", { count: "exact", head: true }),
    ]);

  const adminWalletId = process.env.NEXT_PUBLIC_ADMIN_WALLET_ID || "";
  let adminBalance = "0.00";
  
  if (adminWalletId) {
    try {
      const horizonUrl = process.env.NEXT_PUBLIC_STELLAR_NETWORK === "PUBLIC"
        ? "https://horizon.stellar.org"
        : "https://horizon-testnet.stellar.org";
      const res = await fetch(`${horizonUrl}/accounts/${adminWalletId}`, { next: { revalidate: 60 } });
      if (res.ok) {
        const data = await res.json();
        const native = data.balances?.find((b: any) => b.asset_type === "native");
        if (native) {
          adminBalance = parseFloat(native.balance).toFixed(2);
        }
      }
    } catch (err) {
      console.error("Failed to fetch admin wallet balance", err);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-4xl font-bold">Admin&apos;s Home</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Review KYC, moderate campaigns, and manage platform-level quality controls.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-4">
        <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Pending KYC</p>
          <p className="mt-2 text-3xl font-bold">{pendingKycCount ?? 0}</p>
        </article>
        <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Flagged Campaigns</p>
          <p className="mt-2 text-3xl font-bold">{flaggedCampaignCount ?? 0}</p>
        </article>
        <article className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
          <p className="text-sm text-[var(--muted)]">Total Campaigns</p>
          <p className="mt-2 text-3xl font-bold">{campaignCount ?? 0}</p>
        </article>
        <article className="rounded-2xl border border-[var(--brand)] bg-[var(--brand)]/5 p-5">
          <p className="text-sm text-[var(--brand)] font-semibold">Collected Fees (Admin Wallet)</p>
          <p className="mt-2 text-3xl font-bold text-[var(--brand)]">{adminBalance} XLM</p>
          <p className="mt-1 font-mono text-[10px] text-[var(--muted)] truncate">
            {adminWalletId}
          </p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/kyc"
          className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 transition hover:border-[var(--brand)]"
        >
          <h2 className="text-xl font-semibold">KYC Review</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Approve or reject creator KYC submissions from one queue.
          </p>
        </Link>

        <Link
          href="/admin/campaigns"
          className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 transition hover:border-[var(--brand)]"
        >
          <h2 className="text-xl font-semibold">Campaign Moderation</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Flag campaigns, mark featured campaigns, and inspect proof links.
          </p>
        </Link>
      </section>
    </div>
  );
}
