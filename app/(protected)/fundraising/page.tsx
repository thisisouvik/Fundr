import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createCampaignOnChain } from "@/lib/stellar/factory";

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

async function cleanupUploadedFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  imagePaths: string[],
  proofPath: string | null,
) {
  if (imagePaths.length > 0) {
    await supabase.storage.from(CAMPAIGN_MEDIA_BUCKET).remove(imagePaths);
  }

  if (proofPath) {
    await supabase.storage.from(CAMPAIGN_PROOF_BUCKET).remove([proofPath]);
  }
}

async function createDraftCampaign(formData: FormData) {
  "use server";

  const supabase: any = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: kyc }]: any = await Promise.all([
    supabase
      .from("profiles")
      .select("role, wallet_address")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("fundraiser_kyc")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const isAdmin = profile?.role === "admin";
  const isCreator = profile?.role === "creator" || isAdmin;
  const hasApprovedKyc = kyc?.status === "approved";

  if (!isCreator || (!isAdmin && !hasApprovedKyc)) {
    redirect("/dashboard");
  }

  // wallet_address is required for the Soroban `creator.require_auth()` call
  const creatorWallet: string | null = profile?.wallet_address ?? null;
  if (!creatorWallet) {
    redirect("/fundraising?error=no_wallet");
  }

  const title = String(formData.get("title") ?? "").trim();
  const shortDescription = String(formData.get("short_description") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "technology").trim();
  const deadline = String(formData.get("deadline") ?? "").trim();
  const officialCampaignLink = String(formData.get("official_link") ?? "").trim();
  const goal = Number(formData.get("goal_xlm") ?? 0);
  const proofFile = formData.get("proof_file");
  const imageFiles = formData
    .getAll("campaign_images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (!title || !shortDescription || !description || !deadline || Number.isNaN(goal) || goal <= 0) {
    redirect("/fundraising?error=invalid");
  }

  if (officialCampaignLink && !isHttpUrl(officialCampaignLink)) {
    redirect("/fundraising?error=official_link");
  }

  if (imageFiles.length < CAMPAIGN_MIN_IMAGES || imageFiles.length > CAMPAIGN_MAX_IMAGES) {
    redirect("/fundraising?error=images_count");
  }

  for (const file of imageFiles) {
    if (!file.type.startsWith("image/")) {
      redirect("/fundraising?error=images_type");
    }
    if (file.size > CAMPAIGN_IMAGE_MAX_FILE_SIZE) {
      redirect("/fundraising?error=images_size");
    }
  }

  if (proofFile instanceof File && proofFile.size > 0) {
    const proofTypeAllowed =
      proofFile.type.startsWith("image/") || proofFile.type === "application/pdf";
    if (!proofTypeAllowed) {
      redirect("/fundraising?error=proof_type");
    }
    if (proofFile.size > PROOF_MAX_FILE_SIZE) {
      redirect("/fundraising?error=proof_size");
    }
  }

  const campaignId = crypto.randomUUID();
  const uploadedImageUrls: string[] = [];
  const uploadedImagePaths: string[] = [];

  for (let index = 0; index < imageFiles.length; index += 1) {
    const file = imageFiles[index];
    const safeName = sanitizeFileName(file.name || `campaign-${index + 1}.jpg`);
    const objectPath = `${user.id}/${campaignId}/gallery-${index + 1}-${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from(CAMPAIGN_MEDIA_BUCKET)
      .upload(objectPath, file, {
        upsert: false,
        contentType: file.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      await cleanupUploadedFiles(supabase, uploadedImagePaths, null);
      redirect("/fundraising?error=images_upload");
    }

    const { data: publicUrlData } = supabase.storage
      .from(CAMPAIGN_MEDIA_BUCKET)
      .getPublicUrl(objectPath);
    uploadedImagePaths.push(objectPath);
    uploadedImageUrls.push(publicUrlData.publicUrl);
  }

  let proofDocumentPath: string | null = null;
  if (proofFile instanceof File && proofFile.size > 0) {
    const safeName = sanitizeFileName(proofFile.name || "campaign-proof");
    const objectPath = `${user.id}/${campaignId}/proof-${Date.now()}-${safeName}`;
    const { error: proofUploadError } = await supabase.storage
      .from(CAMPAIGN_PROOF_BUCKET)
      .upload(objectPath, proofFile, {
        upsert: false,
        contentType: proofFile.type,
        cacheControl: "3600",
      });

    if (proofUploadError) {
      await cleanupUploadedFiles(supabase, uploadedImagePaths, null);
      redirect("/fundraising?error=proof_upload");
    }

    proofDocumentPath = objectPath;
  }

  const deadlineIso = new Date(`${deadline}T23:59:59.000Z`).toISOString();

  let onChain;
  try {
    onChain = await createCampaignOnChain({
      creatorWallet: creatorWallet!,
      goalXlm: goal,
      deadlineIso,
      title,
    });
  } catch (err) {
    console.error("[Fundr] on-chain campaign creation failed:", err);
    await cleanupUploadedFiles(supabase, uploadedImagePaths, proofDocumentPath);
    redirect("/fundraising?error=onchain");
  }

  const { error }: any = await supabase.from("campaigns").insert({
    id: campaignId,
    creator_id: user.id,
    contract_address: onChain!.contractAddress,
    factory_tx_hash: onChain!.factoryTxHash,
    title,
    short_description: shortDescription,
    description,
    category,
    image_url: uploadedImageUrls[0] ?? null,
    gallery_urls: uploadedImageUrls.slice(1),
    official_link: officialCampaignLink || null,
    proof_document_url: proofDocumentPath,
    goal_xlm: goal,
    deadline: deadlineIso,
    status: "draft",
  });

  if (error) {
    await cleanupUploadedFiles(supabase, uploadedImagePaths, proofDocumentPath);
    redirect("/fundraising?error=save");
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");
  redirect("/dashboard");
}

export default async function FundraisingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";

  const supabase: any = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: kyc }]: any = await Promise.all([
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("fundraiser_kyc")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const isAdmin = profile?.role === "admin";
  const isCreator = profile?.role === "creator" || isAdmin;
  const hasApprovedKyc = kyc?.status === "approved";

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-4xl font-bold">Fundraising Portal</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Create a campaign draft and prepare it for fundraising launch.
        </p>
      </section>

      {!isCreator ? (
        <section className="max-w-2xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="text-xl font-bold">Creator access required</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            This portal is available only for creator or admin accounts. Submit your KYC in settings so
            admins can verify your identity and upgrade your access.
          </p>
          <Link
            href="/settings"
            className="mt-4 inline-flex rounded-xl border border-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white"
          >
            Complete KYC in Settings
          </Link>
        </section>
      ) : !isAdmin && !hasApprovedKyc ? (
        <section className="max-w-2xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="text-xl font-bold">KYC approval required</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Campaign creation unlocks only after your one-time KYC has been approved by admins.
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Current KYC status: <span className="font-semibold text-[var(--foreground)]">{kyc?.status ?? "not submitted"}</span>
          </p>
          <Link
            href="/settings"
            className="mt-4 inline-flex rounded-xl border border-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white"
          >
            Open Profile and Settings
          </Link>
        </section>
      ) : (
        <section className="max-w-3xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
          <form action={createDraftCampaign} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium">Campaign Title</span>
              <input
                name="title"
                required
                type="text"
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Short Description</span>
              <input
                name="short_description"
                required
                type="text"
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Full Description</span>
              <textarea
                name="description"
                required
                rows={5}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Category</span>
                <select
                  name="category"
                  defaultValue="technology"
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
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Official Campaign Link (optional)</span>
              <input
                name="official_link"
                type="url"
                placeholder="https://example.org/campaign"
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Campaign Proof File (optional)</span>
              <input
                name="proof_file"
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
              />
              <p className="text-xs text-[var(--muted)]">Accepted: PNG, JPG, WEBP, PDF. Maximum size: 6 MB.</p>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">Campaign Images (required, 4 to 5 images)</span>
              <input
                name="campaign_images"
                required
                multiple
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
              />
              <p className="text-xs text-[var(--muted)]">Each image can be up to 4 MB. These images are stored in Supabase Storage.</p>
            </label>

            {error ? (
              <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error === "save"
                  ? "Could not save campaign. Please try again."
                  : error === "no_wallet"
                    ? "You must link a Stellar wallet in your profile before creating a campaign."
                    : error === "onchain"
                      ? "On-chain registration failed. Check that your wallet is funded on Testnet and try again."
                      : error === "official_link"
                        ? "Official campaign link must start with http:// or https://"
                        : error === "images_count"
                          ? "Upload 4 to 5 campaign images."
                          : error === "images_type"
                            ? "Campaign images must be image files."
                            : error === "images_size"
                              ? "Each campaign image must be 4 MB or smaller."
                              : error === "images_upload"
                                ? "Campaign image upload failed. Please try again."
                                : error === "proof_type"
                                  ? "Proof file must be an image or a PDF file."
                                  : error === "proof_size"
                                    ? "Proof file must be 6 MB or smaller."
                                    : error === "proof_upload"
                                      ? "Proof file upload failed. Please try again."
                                      : "Please complete all required fields correctly."}
              </p>
            ) : null}

            <button
              type="submit"
              className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
            >
              Save Draft Campaign
            </button>
          </form>
        </section>
      )}
    </div>
  );
}