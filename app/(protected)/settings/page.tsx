import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const KYC_BUCKET = "kyc-documents";
const KYC_MAX_FILE_SIZE = 5 * 1024 * 1024;

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function updateGeneralSettings(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const bio = String(formData.get("bio") ?? "").trim();
  const websiteUrl = String(formData.get("website_url") ?? "").trim();

  if (!username || !/^[a-z0-9_]{3,24}$/.test(username)) {
    redirect("/settings?error=username_invalid");
  }

  if (websiteUrl && !isHttpUrl(websiteUrl)) {
    redirect("/settings?error=website_invalid");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName || null,
      username,
      bio: bio || null,
      website_url: websiteUrl || null,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      redirect("/settings?error=username_taken");
    }
    redirect("/settings?error=profile_save");
  }

  revalidatePath("/settings");
  redirect("/settings?saved=profile");
}

async function submitKyc(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: existingKyc } = await supabase
    .from("fundraiser_kyc")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingKyc) {
    redirect("/settings");
  }

  const legalName = String(formData.get("legal_name") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const idNumber = String(formData.get("id_number") ?? "").trim();
  const documentImage = formData.get("document_image");

  if (!legalName || !country || !idNumber) {
    redirect("/settings?error=invalid");
  }

  if (!(documentImage instanceof File) || documentImage.size === 0) {
    redirect("/settings?error=kyc_file_missing");
  }

  if (!documentImage.type.startsWith("image/")) {
    redirect("/settings?error=kyc_file_type");
  }

  if (documentImage.size > KYC_MAX_FILE_SIZE) {
    redirect("/settings?error=kyc_file_size");
  }

  const safeName = sanitizeFileName(documentImage.name || "kyc-document.jpg");
  const storagePath = `${user.id}/${Date.now()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from(KYC_BUCKET)
    .upload(storagePath, documentImage, {
      upsert: false,
      contentType: documentImage.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    redirect("/settings?error=kyc_upload");
  }

  const { error } = await supabase.from("fundraiser_kyc").insert({
    user_id: user.id,
    legal_name: legalName,
    country,
    id_number: idNumber,
    document_url: storagePath,
    status: "pending",
  });

  if (error) {
    redirect("/settings?error=save");
  }

  revalidatePath("/settings");
  redirect("/settings?saved=kyc");
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const saved = typeof params.saved === "string" ? params.saved : "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: kyc }] = await Promise.all([
    supabase
      .from("profiles")
      .select("role, is_verified, full_name, username, wallet_address, bio, website_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("fundraiser_kyc")
      .select("legal_name, country, id_number, document_url, status, submitted_at")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  let kycDocumentLink: string | null = null;
  if (kyc?.document_url) {
    if (kyc.document_url.startsWith("http://") || kyc.document_url.startsWith("https://")) {
      kycDocumentLink = kyc.document_url;
    } else {
      const { data: signedUrlData } = await supabase.storage
        .from(KYC_BUCKET)
        .createSignedUrl(kyc.document_url, 60 * 30);
      kycDocumentLink = signedUrlData?.signedUrl ?? null;
    }
  }

  const canSubmitKyc = !kyc;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-4xl font-bold">Profile and Settings</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Manage your profile details{profile?.role === "admin" ? "." : " and submit one-time KYC so admins can review fundraiser access."}
        </p>
      </section>

      <section className="max-w-3xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
        <h2 className="text-xl font-bold">General Settings</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Username must be 3-24 characters with lowercase letters, numbers, or underscores.
        </p>

        <form action={updateGeneralSettings} className="mt-4 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Full Name</span>
            <input
              name="full_name"
              defaultValue={profile?.full_name ?? ""}
              type="text"
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Username</span>
            <input
              name="username"
              required
              defaultValue={profile?.username ?? ""}
              type="text"
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Bio</span>
            <textarea
              name="bio"
              rows={3}
              defaultValue={profile?.bio ?? ""}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Website URL</span>
            <input
              name="website_url"
              defaultValue={profile?.website_url ?? ""}
              type="url"
              placeholder="https://your-site.com"
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
            />
          </label>

          {saved === "profile" ? (
            <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              General settings saved.
            </p>
          ) : null}

          {error === "username_invalid" ||
          error === "username_taken" ||
          error === "website_invalid" ||
          error === "profile_save" ? (
            <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error === "username_taken"
                ? "That username is already taken."
                : error === "username_invalid"
                  ? "Username format is invalid."
                  : error === "website_invalid"
                    ? "Website URL must start with http:// or https://"
                    : "Could not save profile settings. Please try again."}
            </p>
          ) : null}

          <button
            type="submit"
            className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
          >
            Save General Settings
          </button>
        </form>
      </section>

      <section className="max-w-3xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
        <h2 className="text-xl font-bold">Profile Snapshot</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--muted)]">Full name</dt>
            <dd className="font-semibold">{profile?.full_name ?? "Not set"}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Username</dt>
            <dd className="font-semibold">{profile?.username ?? "Not set"}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Wallet</dt>
            <dd className="font-semibold break-all">{profile?.wallet_address ?? "Not connected"}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Verification</dt>
            <dd className="font-semibold">{profile?.is_verified ? "Verified" : "Unverified"}</dd>
          </div>
        </dl>
      </section>

      {profile?.role !== "admin" && (
        <section className="max-w-3xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="text-xl font-bold">Fundraiser KYC (One-time)</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Submit once only. Your legal details and document cannot be edited after submission.
          </p>

          {kyc ? (
            <div className="mt-4 space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-4 text-sm">
              <p>
                <span className="font-semibold">Status:</span> {kyc.status}
              </p>
              <p>
                <span className="font-semibold">Submitted at:</span>{" "}
                {new Date(kyc.submitted_at).toLocaleString()}
              </p>
              <p>
                <span className="font-semibold">Legal name:</span> {kyc.legal_name}
              </p>
              <p>
                <span className="font-semibold">Country:</span> {kyc.country}
              </p>
              <p>
                <span className="font-semibold">ID number:</span> {kyc.id_number}
              </p>
              {kycDocumentLink ? (
                <p className="break-all">
                  <span className="font-semibold">Document:</span>{" "}
                  <a
                    href={kycDocumentLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--brand)] underline"
                  >
                    View uploaded ID document
                  </a>
                </p>
              ) : null}
            </div>
          ) : canSubmitKyc ? (
            <form action={submitKyc} className="mt-4 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Legal Name</span>
                <input
                  required
                  name="legal_name"
                  type="text"
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Country</span>
                <input
                  required
                  name="country"
                  type="text"
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Government ID Number</span>
                <input
                  required
                  name="id_number"
                  type="text"
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Government ID Image</span>
                <input
                  required
                  name="document_image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
                />
                <p className="text-xs text-[var(--muted)]">Accepted: PNG, JPG, WEBP. Maximum file size: 5 MB.</p>
              </label>

              {saved === "kyc" ? (
                <p className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  KYC submitted successfully. Your status is now pending review.
                </p>
              ) : null}

              {error === "save" ||
              error === "invalid" ||
              error === "kyc_file_missing" ||
              error === "kyc_file_type" ||
              error === "kyc_file_size" ||
              error === "kyc_upload" ||
              error === "kyc_required" ? (
                <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error === "save"
                    ? "KYC submission failed. Please try again."
                    : error === "kyc_file_missing"
                      ? "Please upload your government ID image."
                      : error === "kyc_file_type"
                        ? "Only image files are allowed for KYC."
                        : error === "kyc_file_size"
                          ? "KYC image is too large. Maximum size is 5 MB."
                          : error === "kyc_upload"
                            ? "Upload failed. Please try again."
                      : error === "kyc_required"
                        ? "Complete your KYC to unlock creator-only pages."
                            : "Please provide valid KYC values."}
                </p>
              ) : null}

              <button
                type="submit"
                className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
              >
                Submit KYC (One-time)
              </button>
            </form>
          ) : (
            <p className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted)]">
              KYC submission is currently unavailable.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
