import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CampaignImageCarousel } from "@/components/campaigns/CampaignImageCarousel";
import { DonationPanel } from "@/components/campaigns/DonationPanel";
import { RecentDonors } from "@/components/campaigns/RecentDonors";
import { CommentsSection } from "@/components/campaigns/CommentsSection";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const now = new Date();

  // Fetch campaign
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (campaignError || !campaign) {
    redirect("/campaigns");
  }

  await supabase
    .from("campaigns")
    .update({ views_count: Number(campaign.views_count ?? 0) + 1 })
    .eq("id", campaign.id);

  // Fetch creator profile
  const { data: creator } = await supabase
    .from("profiles")
    .select("full_name, username, avatar_url")
    .eq("id", campaign.creator_id)
    .maybeSingle();

  // Fetch contributions for progress
  const { data: contributions = [] } = await supabase
    .from("contributions")
    .select("amount_xlm, wallet_address")
    .eq("campaign_id", campaign.id)
    .eq("status", "confirmed");

  const confirmedContributions = contributions ?? [];
  const raised = confirmedContributions.reduce(
    (sum, c) => sum + Number(c.amount_xlm),
    0,
  );
  const uniqueBackers = new Set(confirmedContributions.map((c) => c.wallet_address)).size;
  const progress = (raised / Number(campaign.goal_xlm)) * 100;
  const daysLeft = Math.ceil(
    (new Date(campaign.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
        {/* Back Link */}
        <Link href="/campaigns" className="mb-6 inline-flex text-sm font-semibold text-[var(--brand)] hover:underline">
          ← Back to campaigns
        </Link>

        {/* Main Grid */}
        <div className="grid gap-8 lg:grid-cols-[1fr_0.5fr]">
          {/* Left: Gallery and Details */}
          <div className="space-y-8">
            {/* Auto-Rotating Image Carousel */}
            <CampaignImageCarousel
              title={campaign.title}
              imageUrl={campaign.image_url}
              galleryUrls={campaign.gallery_urls}
            />

            {/* Campaign Header */}
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-[var(--brand)]">{campaign.category.toUpperCase()}</p>
                <h1 className="text-4xl font-bold">{campaign.title}</h1>
              </div>

              {/* Creator Info */}
              <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
                {creator?.avatar_url ? (
                  <Image
                    src={creator.avatar_url}
                    alt={creator.full_name || "Creator"}
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-[var(--brand-soft)]" />
                )}
                <div>
                  <p className="font-semibold">{creator?.full_name || "Anonymous Creator"}</p>
                  <p className="text-sm text-[var(--muted)]">@{creator?.username || "unknown"}</p>
                </div>
              </div>
            </div>

            {/* Full Description */}
            <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
              <h2 className="text-2xl font-bold">Campaign Story</h2>
              <div className="prose prose-sm max-w-none text-[var(--foreground)]">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">{campaign.description}</p>
              </div>
            </div>

            {/* Recent Donors */}
            <RecentDonors campaignId={campaign.id} />

            {/* Comments Section */}
            <CommentsSection campaignId={campaign.id} />
          </div>

          {/* Right: Sticky Donation Panel */}
          <div className="lg:sticky lg:top-6 lg:h-fit">
            <DonationPanel campaign={campaign} raised={raised} uniqueBackers={uniqueBackers} progress={progress} daysLeft={daysLeft} />
          </div>
        </div>
      </div>
    </div>
  );
}
