import Image from "next/image";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCampaignOwnerAccess } from "@/lib/auth/creator";

const CAMPAIGN_MEDIA_BUCKET = "campaign-media";
const CAMPAIGN_PROOF_BUCKET = "campaign-proofs";
const CAMPAIGN_MIN_IMAGES = 4;
const CAMPAIGN_MAX_IMAGES = 5;
const CAMPAIGN_IMAGE_MAX_FILE_SIZE = 4 * 1024 * 1024;
const PROOF_MAX_FILE_SIZE = 6 * 1024 * 1024;

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function extractMediaPathFromPublicUrl(publicUrl: string) {
  try {
    const parsed = new URL(publicUrl);
    const marker = `/object/public/${CAMPAIGN_MEDIA_BUCKET}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) {
      return null;
    }

    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

async function getAuthorizedCampaignContext(campaignId: string) {
  const { supabase, user, campaign, isAdmin } = await requireCampaignOwnerAccess(campaignId);
  const isOwner = campaign.creator_id === user.id;

  return { supabase, user, campaign, isAdmin, isOwner };
}

async function updateCampaignBasics(formData: FormData) {
  "use server";

  const campaignId = String(formData.get("campaign_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const shortDescription = String(formData.get("short_description") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "technology").trim();
  const deadline = String(formData.get("deadline") ?? "").trim();
  const officialCampaignLink = String(formData.get("official_link") ?? "").trim();
  const goal = Number(formData.get("goal_xlm") ?? 0);

  if (!campaignId || !title || !shortDescription || !description || !deadline || Number.isNaN(goal) || goal <= 0) {
    redirect(`/fundraising/manage/${campaignId}?error=invalid`);
  }

  if (officialCampaignLink && !isHttpUrl(officialCampaignLink)) {
    redirect(`/fundraising/manage/${campaignId}?error=official_link`);
  }

  const { supabase }: any = await getAuthorizedCampaignContext(campaignId);

  const { error }: any = await supabase
    .from("campaigns")
    .update({
      title,
      short_description: shortDescription,
      description,
      category,
      goal_xlm: goal,
      official_link: officialCampaignLink || null,
      deadline: new Date(`${deadline}T23:59:59.000Z`).toISOString(),
    })
    .eq("id", campaignId);

  if (error) {
    redirect(`/fundraising/manage/${campaignId}?error=save`);
  }

  revalidatePath(`/fundraising/manage/${campaignId}`);
  revalidatePath("/dashboard");
  revalidatePath("/campaigns");
  redirect(`/fundraising/manage/${campaignId}?saved=basics`);
}

async function uploadCampaignMedia(formData: FormData) {
  "use server";

  const campaignId = String(formData.get("campaign_id") ?? "").trim();
  if (!campaignId) {
    redirect("/dashboard");
  }

  const files = formData
    .getAll("new_images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    redirect(`/fundraising/manage/${campaignId}?error=new_images_missing`);
  }

  const { supabase, campaign }: any = await getAuthorizedCampaignContext(campaignId);

  const currentImages = [campaign.image_url, ...(campaign.gallery_urls ?? [])].filter(
    (url): url is string => Boolean(url),
  );

  if (currentImages.length + files.length > CAMPAIGN_MAX_IMAGES) {
    redirect(`/fundraising/manage/${campaignId}?error=images_count`);
  }

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      redirect(`/fundraising/manage/${campaignId}?error=images_type`);
    }

    if (file.size > CAMPAIGN_IMAGE_MAX_FILE_SIZE) {
      redirect(`/fundraising/manage/${campaignId}?error=images_size`);
    }
  }

  const uploadedPaths: string[] = [];
  const uploadedUrls: string[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const safeName = sanitizeFileName(file.name || `gallery-${index + 1}.jpg`);
    const path = `${campaign.creator_id}/${campaignId}/gallery-add-${Date.now()}-${index + 1}-${safeName}`;

    const { error: uploadError } = await supabase.storage.from(CAMPAIGN_MEDIA_BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "3600",
    });

    if (uploadError) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(CAMPAIGN_MEDIA_BUCKET).remove(uploadedPaths);
      }
      redirect(`/fundraising/manage/${campaignId}?error=images_upload`);
    }

    const { data: publicUrlData } = supabase.storage.from(CAMPAIGN_MEDIA_BUCKET).getPublicUrl(path);
    uploadedPaths.push(path);
    uploadedUrls.push(publicUrlData.publicUrl);
  }

  const existingGallery = campaign.gallery_urls ?? [];
  const imageUrl = campaign.image_url || uploadedUrls[0] || null;
  const newGallery = campaign.image_url
    ? [...existingGallery, ...uploadedUrls]
    : [...existingGallery, ...uploadedUrls.slice(1)];

  const { error: updateError }: any = await supabase
    .from("campaigns")
    .update({ image_url: imageUrl, gallery_urls: newGallery })
    .eq("id", campaignId);

  if (updateError) {
    await supabase.storage.from(CAMPAIGN_MEDIA_BUCKET).remove(uploadedPaths);
    redirect(`/fundraising/manage/${campaignId}?error=save`);
  }

  revalidatePath(`/fundraising/manage/${campaignId}`);
  revalidatePath(`/campaigns`);
  redirect(`/fundraising/manage/${campaignId}?saved=images`);
}

async function removeGalleryImage(formData: FormData) {
  "use server";

  const campaignId = String(formData.get("campaign_id") ?? "").trim();
  const targetUrl = String(formData.get("target_url") ?? "").trim();

  if (!campaignId || !targetUrl) {
    redirect(`/fundraising/manage/${campaignId}?error=invalid`);
  }

  const { supabase, campaign }: any = await getAuthorizedCampaignContext(campaignId);

  const images = [campaign.image_url, ...(campaign.gallery_urls ?? [])].filter(
    (url): url is string => Boolean(url),
  );

  if (!images.includes(targetUrl)) {
    redirect(`/fundraising/manage/${campaignId}?error=image_not_found`);
  }

  if (images.length <= CAMPAIGN_MIN_IMAGES) {
    redirect(`/fundraising/manage/${campaignId}?error=images_min`);
  }

  const filteredImages = images.filter((url) => url !== targetUrl);
  const nextCover = filteredImages[0] || null;
  const nextGallery = filteredImages.slice(1);

  const { error }: any = await supabase
    .from("campaigns")
    .update({ image_url: nextCover, gallery_urls: nextGallery })
    .eq("id", campaignId);

  if (error) {
    redirect(`/fundraising/manage/${campaignId}?error=save`);
  }

  const objectPath = extractMediaPathFromPublicUrl(targetUrl);
  if (objectPath) {
    await supabase.storage.from(CAMPAIGN_MEDIA_BUCKET).remove([objectPath]);
  }

  revalidatePath(`/fundraising/manage/${campaignId}`);
  revalidatePath(`/campaigns`);
  redirect(`/fundraising/manage/${campaignId}?saved=image_removed`);
}

async function replaceProofFile(formData: FormData) {
  "use server";

  const campaignId = String(formData.get("campaign_id") ?? "").trim();
  if (!campaignId) {
    redirect("/dashboard");
  }

  const file = formData.get("proof_file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/fundraising/manage/${campaignId}?error=proof_missing`);
  }

  const isAllowed = file.type.startsWith("image/") || file.type === "application/pdf";
  if (!isAllowed) {
    redirect(`/fundraising/manage/${campaignId}?error=proof_type`);
  }

  if (file.size > PROOF_MAX_FILE_SIZE) {
    redirect(`/fundraising/manage/${campaignId}?error=proof_size`);
  }

  const { supabase, campaign }: any = await getAuthorizedCampaignContext(campaignId);

  const safeName = sanitizeFileName(file.name || "proof");
  const path = `${campaign.creator_id}/${campaignId}/proof-${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from(CAMPAIGN_PROOF_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type,
    cacheControl: "3600",
  });

  if (uploadError) {
    redirect(`/fundraising/manage/${campaignId}?error=proof_upload`);
  }

  const previousProofPath = campaign.proof_document_url;
  const { error: updateError }: any = await supabase
    .from("campaigns")
    .update({ proof_document_url: path })
    .eq("id", campaignId);

  if (updateError) {
    await supabase.storage.from(CAMPAIGN_PROOF_BUCKET).remove([path]);
    redirect(`/fundraising/manage/${campaignId}?error=save`);
  }

  if (previousProofPath) {
    await supabase.storage.from(CAMPAIGN_PROOF_BUCKET).remove([previousProofPath]);
  }

  revalidatePath(`/fundraising/manage/${campaignId}`);
  redirect(`/fundraising/manage/${campaignId}?saved=proof`);
}

async function removeProofFile(formData: FormData) {
  "use server";

  const campaignId = String(formData.get("campaign_id") ?? "").trim();
  if (!campaignId) {
    redirect("/dashboard");
  }

  const { supabase, campaign }: any = await getAuthorizedCampaignContext(campaignId);

  if (!campaign.proof_document_url) {
    redirect(`/fundraising/manage/${campaignId}`);
  }

  const currentProofPath = campaign.proof_document_url;
  const { error }: any = await supabase
    .from("campaigns")
    .update({ proof_document_url: null })
    .eq("id", campaignId);

  if (error) {
    redirect(`/fundraising/manage/${campaignId}?error=save`);
  }

  await supabase.storage.from(CAMPAIGN_PROOF_BUCKET).remove([currentProofPath]);

  revalidatePath(`/fundraising/manage/${campaignId}`);
  redirect(`/fundraising/manage/${campaignId}?saved=proof_removed`);
}

async function deleteCampaign(formData: FormData) {
  "use server";

  const campaignId = String(formData.get("campaign_id") ?? "").trim();
  if (!campaignId) {
    redirect("/dashboard");
  }

  const { supabase, campaign }: any = await getAuthorizedCampaignContext(campaignId);

  const mediaUrls = [campaign.image_url, ...(campaign.gallery_urls ?? [])].filter(
    (url): url is string => Boolean(url),
  );
  const mediaPaths = mediaUrls
    .map((url) => extractMediaPathFromPublicUrl(url))
    .filter((path): path is string => Boolean(path));

  const proofPath = campaign.proof_document_url;

  const { error }: any = await supabase.from("campaigns").delete().eq("id", campaignId);
  if (error) {
    redirect(`/fundraising/manage/${campaignId}?error=delete`);
  }

  if (mediaPaths.length > 0) {
    await supabase.storage.from(CAMPAIGN_MEDIA_BUCKET).remove(mediaPaths);
  }

  if (proofPath) {
    await supabase.storage.from(CAMPAIGN_PROOF_BUCKET).remove([proofPath]);
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/campaigns");
  redirect("/dashboard?deleted=campaign");
}

export default async function ManageCampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const error = typeof query.error === "string" ? query.error : "";
  const saved = typeof query.saved === "string" ? query.saved : "";

  const { supabase, campaign }: any = await getAuthorizedCampaignContext(id);

  const { data: campaignFull }: any = await supabase
    .from("campaigns")
    .select(
      "id, title, short_description, description, category, goal_xlm, deadline, status, image_url, gallery_urls, official_link, proof_document_url, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!campaignFull) {
    redirect("/dashboard");
  }

  let proofPreviewUrl: string | null = null;
  if (campaignFull.proof_document_url) {
    const { data }: any = await supabase
      .storage
      .from(CAMPAIGN_PROOF_BUCKET)
      .createSignedUrl(campaignFull.proof_document_url, 60 * 30);
    proofPreviewUrl = data?.signedUrl ?? null;
  }

  const allImages = [campaignFull.image_url, ...(campaignFull.gallery_urls ?? [])].filter(
    (url): url is string => Boolean(url),
  );

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Manage Campaign</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Edit campaign details, manage gallery media, and control proof documents.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-semibold transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
        >
          Back to Dashboard
        </Link>
      </section>

      {saved ? (
        <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Update successful: {saved.replaceAll("_", " ")}.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error === "invalid"
            ? "Please provide valid values."
            : error === "save"
              ? "Could not save campaign changes."
              : error === "official_link"
                ? "Official campaign link must start with http:// or https://"
                : error === "new_images_missing"
                  ? "Please select one or more images."
                  : error === "images_count"
                    ? `Total images cannot exceed ${CAMPAIGN_MAX_IMAGES}.`
                    : error === "images_type"
                      ? "Only image files are allowed for gallery uploads."
                      : error === "images_size"
                        ? "Each gallery image must be 4 MB or smaller."
                        : error === "images_upload"
                          ? "Gallery upload failed."
                          : error === "images_min"
                            ? `At least ${CAMPAIGN_MIN_IMAGES} images are required.`
                            : error === "image_not_found"
                              ? "The selected image was not found."
                              : error === "proof_missing"
                                ? "Please select a proof file to upload."
                                : error === "proof_type"
                                  ? "Proof file must be an image or a PDF."
                                  : error === "proof_size"
                                    ? "Proof file must be 6 MB or smaller."
                                    : error === "proof_upload"
                                      ? "Proof upload failed."
                                      : error === "delete"
                                        ? "Could not delete campaign."
                                        : "An error occurred."}
        </p>
      ) : null}

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
        <h2 className="text-xl font-bold">Campaign Basics</h2>
        <form action={updateCampaignBasics} className="mt-4 space-y-4">
          <input type="hidden" name="campaign_id" value={campaignFull.id} />

          <label className="block space-y-2">
            <span className="text-sm font-medium">Campaign Title</span>
            <input
              name="title"
              required
              defaultValue={campaignFull.title}
              type="text"
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Short Description</span>
            <input
              name="short_description"
              required
              defaultValue={campaignFull.short_description}
              type="text"
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Full Description</span>
            <textarea
              name="description"
              required
              rows={6}
              defaultValue={campaignFull.description}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Category</span>
              <select
                name="category"
                defaultValue={campaignFull.category}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
              >
                <option value="technology">Technology</option>
                <option value="art">Art</option>
                <option value="education">Education</option>
                <option value="environment">Environment</option>
                <option value="health">Health</option>
                <option value="community">Community</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Goal (XLM)</span>
              <input
                name="goal_xlm"
                required
                min={1}
                step="0.01"
                defaultValue={Number(campaignFull.goal_xlm)}
                type="number"
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Deadline</span>
              <input
                name="deadline"
                required
                type="date"
                defaultValue={new Date(campaignFull.deadline).toISOString().slice(0, 10)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Official Campaign Link (optional)</span>
            <input
              name="official_link"
              type="url"
              defaultValue={campaignFull.official_link ?? ""}
              placeholder="https://example.org/campaign"
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
            />
          </label>

          <button
            type="submit"
            className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
          >
            Save Basic Changes
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
        <h2 className="text-xl font-bold">Gallery Management</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Current images: {allImages.length}. Minimum {CAMPAIGN_MIN_IMAGES}, maximum {CAMPAIGN_MAX_IMAGES}.
        </p>

        <form action={uploadCampaignMedia} className="mt-4 space-y-3">
          <input type="hidden" name="campaign_id" value={campaignFull.id} />
          <input
            name="new_images"
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
          />
          <p className="text-xs text-[var(--muted)]">Upload more images (4 MB max each).</p>
          <button
            type="submit"
            className="rounded-xl border border-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white"
          >
            Upload Images
          </button>
        </form>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allImages.map((url, index) => (
            <article key={`${url}-${index}`} className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)]">
              <div className="relative h-40 w-full">
                <Image
                  src={url}
                  alt={`Campaign image ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-xs">
                <span className="font-semibold">{index === 0 ? "Cover" : `Gallery ${index}`}</span>
                <form action={removeGalleryImage}>
                  <input type="hidden" name="campaign_id" value={campaignFull.id} />
                  <input type="hidden" name="target_url" value={url} />
                  <button
                    type="submit"
                    className="rounded-lg border border-red-300 px-2 py-1 font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Remove
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
        <h2 className="text-xl font-bold">Proof File</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Upload an optional proof document (image or PDF, max 6 MB).
        </p>

        {campaign.proof_document_url ? (
          <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-4">
            <p className="text-sm font-semibold">Stored path</p>
            <p className="mt-1 break-all text-xs text-[var(--muted)]">{campaign.proof_document_url}</p>
            {proofPreviewUrl ? (
              <a
                href={proofPreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-sm font-semibold text-[var(--brand)] underline"
              >
                Preview current proof file
              </a>
            ) : null}

            <form action={removeProofFile} className="mt-3">
              <input type="hidden" name="campaign_id" value={campaignFull.id} />
              <button
                type="submit"
                className="rounded-xl border border-red-300 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
              >
                Remove Proof File
              </button>
            </form>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">No proof file uploaded.</p>
        )}

        <form action={replaceProofFile} className="mt-4 space-y-3">
          <input type="hidden" name="campaign_id" value={campaignFull.id} />
          <input
            name="proof_file"
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
          />
          <button
            type="submit"
            className="rounded-xl border border-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white"
          >
            Upload or Replace Proof
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-xl font-bold text-red-700">Danger Zone</h2>
        <p className="mt-2 text-sm text-red-700/80">
          Deleting a campaign removes the record and attempts to clean up related storage files.
        </p>

        <form action={deleteCampaign} className="mt-4">
          <input type="hidden" name="campaign_id" value={campaignFull.id} />
          <button
            type="submit"
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Delete Campaign
          </button>
        </form>
      </section>
    </div>
  );
}
