import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPanelAccess } from "@/lib/auth/admin";

async function updateCampaignModeration(formData: FormData) {
  "use server";

  const { supabase }: any = await requireAdminPanelAccess();

  const campaignId = String(formData.get("campaign_id") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();
  const reason = String(formData.get("flag_reason") ?? "").trim();

  if (!campaignId) {
    redirect("/admin/campaigns?error=invalid");
  }

  if (action === "toggle_flag") {
    const { data: existing }: any = await supabase
      .from("campaigns")
      .select("is_flagged")
      .eq("id", campaignId)
      .maybeSingle();

    const nextFlag = !existing?.is_flagged;
    const { error }: any = await supabase
      .from("campaigns")
      .update({ is_flagged: nextFlag, flag_reason: nextFlag ? reason || "Flagged by admin" : null })
      .eq("id", campaignId);

    if (error) {
      redirect("/admin/campaigns?error=save");
    }
  } else if (action === "toggle_featured") {
    const { data: existing }: any = await supabase
      .from("campaigns")
      .select("is_featured")
      .eq("id", campaignId)
      .maybeSingle();

    const { error }: any = await supabase
      .from("campaigns")
      .update({ is_featured: !existing?.is_featured })
      .eq("id", campaignId);

    if (error) {
      redirect("/admin/campaigns?error=save");
    }
  } else {
    redirect("/admin/campaigns?error=invalid");
  }

  revalidatePath("/admin/campaigns");
  revalidatePath("/admin");
  revalidatePath("/campaigns");
  redirect("/admin/campaigns?saved=1");
}

export default async function AdminCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const saved = typeof params.saved === "string" ? params.saved : "";
  const error = typeof params.error === "string" ? params.error : "";

  const { supabase }: any = await requireAdminPanelAccess();

  const { data: campaigns = [] }: any = await supabase
    .from("campaigns")
    .select(
      "id, title, slug, status, category, is_flagged, flag_reason, is_featured, official_link, proof_document_url, creator_id, created_at",
    )
    .order("created_at", { ascending: false });

  const creatorIds = campaigns.map((item: any) => item.creator_id);
  const { data: creators = [] }: any = creatorIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, full_name")
        .in("id", creatorIds)
    : { data: [] };
  const creatorMap = new Map(creators.map((entry: any) => [entry.id, entry]));

  const proofPreviewMap = new Map<string, string>();
  for (const campaign of campaigns) {
    if (!campaign.proof_document_url) {
      continue;
    }

    if (campaign.proof_document_url.startsWith("http://") || campaign.proof_document_url.startsWith("https://")) {
      proofPreviewMap.set(campaign.id, campaign.proof_document_url);
      continue;
    }

    const { data } = await supabase.storage
      .from("campaign-proofs")
      .createSignedUrl(campaign.proof_document_url, 60 * 20);

    if (data?.signedUrl) {
      proofPreviewMap.set(campaign.id, data.signedUrl);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-4xl font-bold">Campaign Moderation</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Flag unsafe campaigns, set featured items, and inspect official proof assets.
        </p>
      </section>

      {saved ? (
        <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Moderation update saved.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not update campaign moderation state.
        </p>
      ) : null}

      <section className="space-y-4">
        {campaigns.map((campaign: any) => {
          const creator: any = creatorMap.get(campaign.creator_id);

          return (
            <article key={campaign.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{campaign.title}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    @{creator?.username || "unknown"} | {creator?.full_name || "No name"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    status: {campaign.status} | category: {campaign.category}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                    {campaign.is_flagged ? "Flagged" : "Clean"}
                  </span>
                  <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                    {campaign.is_featured ? "Featured" : "Normal"}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <p>
                  <span className="font-semibold">Official link:</span>{" "}
                  {campaign.official_link ? (
                    <a
                      href={campaign.official_link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--brand)] underline"
                    >
                      Open link
                    </a>
                  ) : (
                    <span className="text-[var(--muted)]">Not provided</span>
                  )}
                </p>

                <p>
                  <span className="font-semibold">Proof:</span>{" "}
                  {proofPreviewMap.get(campaign.id) ? (
                    <a
                      href={proofPreviewMap.get(campaign.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--brand)] underline"
                    >
                      Preview proof file
                    </a>
                  ) : (
                    <span className="text-[var(--muted)]">No proof uploaded</span>
                  )}
                </p>
              </div>

              {campaign.flag_reason ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <span className="font-semibold">Flag reason:</span> {campaign.flag_reason}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <form action={updateCampaignModeration} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="campaign_id" value={campaign.id} />
                  <input type="hidden" name="action" value="toggle_flag" />
                  <input
                    type="text"
                    name="flag_reason"
                    placeholder="Flag reason"
                    className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-xs outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-xl border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                  >
                    {campaign.is_flagged ? "Unflag" : "Flag"}
                  </button>
                </form>

                <form action={updateCampaignModeration}>
                  <input type="hidden" name="campaign_id" value={campaign.id} />
                  <input type="hidden" name="action" value="toggle_featured" />
                  <button
                    type="submit"
                    className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-semibold transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                  >
                    {campaign.is_featured ? "Remove Featured" : "Set Featured"}
                  </button>
                </form>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
