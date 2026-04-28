export const dynamic = 'force-dynamic';
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CampaignFilters from "./CampaignFilters";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const category = typeof params.category === "string" ? params.category : "";
  const sort = typeof params.sort === "string" ? params.sort : "newest";
  const search = typeof params.search === "string" ? params.search : "";

  const supabase = await createClient();
  const now = new Date();

  let query = supabase
    .from("campaigns")
    .select(
      `
      id,
      title,
      slug,
      short_description,
      image_url,
      category,
      goal_xlm,
      deadline,
      status
    `,
      { count: "exact" }
    )
    .eq("status", "active");

  if (category) {
    query = query.eq("category", category);
  }

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  if (sort === "newest") {
    query = query.order("created_at", { ascending: false });
  } else if (sort === "ending-soon") {
    query = query.order("deadline", { ascending: true });
  } else if (sort === "most-funded") {
    query = query.order("goal_xlm", { ascending: false });
  }

  const { data: campaigns = [], count = 0, error } = await query.limit(20);
  const activeCampaigns = campaigns ?? [];

  // Fetch contributions for progress calculation
  const campaignIds = activeCampaigns.map((c) => c.id);
  const { data: contributions = [] } = campaignIds.length
    ? await supabase
        .from("contributions")
        .select("campaign_id, amount_xlm")
        .in("campaign_id", campaignIds)
        .eq("status", "confirmed")
    : { data: [] };
  const confirmedContributions = contributions ?? [];

  const raisedByCampaign = confirmedContributions.reduce<Record<string, number>>((acc, c) => {
    acc[c.campaign_id] = (acc[c.campaign_id] ?? 0) + Number(c.amount_xlm);
    return acc;
  }, {});

  const categories = ["technology", "art", "education", "environment", "health", "community"];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 md:px-8">
        {/* Header */}
        <section className="mb-12 space-y-4">
          <h1 className="text-4xl font-bold">Active Campaigns</h1>
          <p className="max-w-2xl text-sm text-[var(--muted)]">
            Discover and support fundraising campaigns happening right now.
          </p>
        </section>

        {/* Filters and Search */}
        <CampaignFilters
          search={search}
          category={category}
          sort={sort}
          categories={categories}
        />

        {/* Campaigns Grid */}
        {error ? (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-center text-red-700">
            <p className="font-semibold">Error loading campaigns</p>
            <p className="mt-1 text-sm">{error.message}</p>
          </div>
        ) : activeCampaigns.length === 0 ? (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-12 text-center">
            <p className="text-lg font-semibold">No campaigns found</p>
            <p className="mt-2 text-sm text-[var(--muted)]">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeCampaigns.map((campaign) => {
              const raised = raisedByCampaign[campaign.id] ?? 0;
              const progress = Math.min((raised / Number(campaign.goal_xlm)) * 100, 100);
              const daysLeft = Math.ceil(
                (new Date(campaign.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              );

              return (
                <Link
                  key={campaign.id}
                  href={`/campaigns/${campaign.slug}`}
                  className="group overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] transition hover:border-[var(--brand)]"
                >
                  {/* Image */}
                  <div className="relative h-40 w-full overflow-hidden bg-[var(--surface-soft)]">
                    {campaign.image_url ? (
                      <Image
                        src={campaign.image_url}
                        alt={campaign.title}
                        fill
                        className="object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[var(--muted)]">
                        No image
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="space-y-3 p-4">
                    <div>
                      <p className="text-xs font-semibold text-[var(--brand)]">
                        {campaign.category.toUpperCase()}
                      </p>
                      <h3 className="line-clamp-2 font-semibold">{campaign.title}</h3>
                    </div>

                    <p className="line-clamp-2 text-xs text-[var(--muted)]">{campaign.short_description}</p>

                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="h-2 w-full rounded-full bg-[var(--brand-soft)]">
                        <div
                          className="h-2 rounded-full bg-[var(--brand)]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <p className="font-semibold">{raised.toFixed(2)} XLM</p>
                        <p className="text-[var(--muted)]">{progress.toFixed(0)}% of {campaign.goal_xlm} XLM</p>
                      </div>
                    </div>

                    {/* Days Left */}
                    <div className="text-xs text-[var(--muted)]">
                      {daysLeft > 0 ? `${daysLeft} days left` : "Campaign ended"}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination or results count */}
        <div className="mt-8 text-center text-sm text-[var(--muted)]">
          Showing {activeCampaigns.length} of {count} campaigns
        </div>
      </div>
    </div>
  );
}
