import Link from "next/link";
import { requireAdminPanelAccess } from "@/lib/auth/admin";

export default async function AdminPanelPage() {
  const { supabase } = await requireAdminPanelAccess();

  const [{ count: pendingKycCount }, { count: flaggedCampaignCount }, { count: campaignCount }] =
    await Promise.all([
      supabase
        .from("fundraiser_kyc")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("is_flagged", true),
      supabase.from("campaigns").select("id", { count: "exact", head: true }),
    ]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-4xl font-bold">Admin Home</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Review KYC, moderate campaigns, and manage platform-level quality controls.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
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
