import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function FeaturedCampaignsSection() {
  const supabase = await createClient();
  const now = new Date();

  // Fetch top 4 active campaigns
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, title, slug, image_url, category, short_description, goal_xlm, deadline")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(4);

  const activeCampaigns = campaigns ?? [];

  // Fetch contributions for progress
  const campaignIds = activeCampaigns.map((c) => c.id);
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

  return (
    <section className="border-y border-[var(--line)] bg-[var(--surface-soft)] py-16">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-4xl font-bold reveal-up">Featured Campaigns</h2>
          <Link
            href="/campaigns"
            className="rounded-full border border-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white"
          >
            Show More
          </Link>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {activeCampaigns.map((campaign, index) => {
            const raised = raisedByCampaign[campaign.id] ?? 0;
            const progress = Math.min((raised / Number(campaign.goal_xlm)) * 100, 100);

            return (
              <article
                key={campaign.id}
                className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] reveal-zoom lift-hover"
                style={{ animationDelay: `${index * 110}ms` }}
              >
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
                <div className="space-y-3 p-4">
                  <h3 className="line-clamp-2 min-h-12 text-sm font-semibold">{campaign.title}</h3>
                  <p className="text-xs text-[var(--muted)] uppercase">{campaign.category}</p>
                  <div>
                    <div className="mb-2 h-2 rounded-full bg-[var(--brand-soft)]">
                      <div
                        className="h-2 rounded-full bg-[var(--brand)]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <p className="font-semibold">{raised.toFixed(2)} XLM</p>
                      <p className="text-[var(--muted)]">{progress.toFixed(0)}% funded</p>
                    </div>
                  </div>
                  <Link
                    href={`/fund?campaign=${encodeURIComponent(campaign.title)}`}
                    className="block w-full rounded-full border border-[var(--brand)] py-2 text-center text-sm font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white"
                  >
                    Fund
                  </Link>
                </div>
              </article>
            );
          })}

          {activeCampaigns.length === 0 && (
            <p className="col-span-full py-12 text-center text-[var(--muted)]">
              No featured campaigns currently active.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
