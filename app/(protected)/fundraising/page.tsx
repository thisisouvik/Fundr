import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createCampaignOnChain } from "@/lib/stellar/factory";
import CreateCampaignForm from "./CreateCampaignForm";

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
        <CreateCampaignForm action={createDraftCampaign} error={error} />
      )}
    </div>
  );
}