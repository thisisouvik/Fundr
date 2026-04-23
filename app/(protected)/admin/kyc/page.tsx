import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPanelAccess } from "@/lib/auth/admin";

async function reviewKyc(formData: FormData) {
  "use server";

  const { supabase }: any = await requireAdminPanelAccess();

  const kycId = String(formData.get("kyc_id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();

  if (!kycId || (decision !== "approved" && decision !== "rejected")) {
    redirect("/admin/kyc?error=invalid");
  }

  const { data: updated, error }: any = await supabase
    .from("fundraiser_kyc")
    .update({ status: decision })
    .eq("id", kycId)
    .select("user_id")
    .maybeSingle();

  if (error || !updated?.user_id) {
    redirect("/admin/kyc?error=save");
  }

  if (decision === "approved") {
    await (supabase
      .from("profiles") as any)
      .update({ role: "creator", is_verified: true })
      .eq("id", updated.user_id);
  } else {
    await (supabase
      .from("profiles") as any)
      .update({ is_verified: false })
      .eq("id", updated.user_id);
  }

  revalidatePath("/admin/kyc");
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  redirect(`/admin/kyc?saved=${decision}`);
}

export default async function AdminKycPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const saved = typeof params.saved === "string" ? params.saved : "";
  const error = typeof params.error === "string" ? params.error : "";

  const { supabase }: any = await requireAdminPanelAccess();

  const { data: records = [] }: any = await supabase
    .from("fundraiser_kyc")
    .select("id, user_id, legal_name, country, id_number, document_url, status, submitted_at")
    .order("submitted_at", { ascending: false });

  const profileIds = records.map((row: any) => row.user_id);
  const { data: userProfiles = [] }: any = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, full_name, role, is_verified")
        .in("id", profileIds)
    : { data: [] };

  const profileMap = new Map(userProfiles.map((entry: any) => [entry.id, entry]));
  const documentPreviewMap = new Map<string, string>();

  for (const record of records) {
    if (!record.document_url) {
      continue;
    }

    if (record.document_url.startsWith("http://") || record.document_url.startsWith("https://")) {
      documentPreviewMap.set(record.id, record.document_url);
      continue;
    }

    const { data } = await supabase.storage
      .from("kyc-documents")
      .createSignedUrl(record.document_url, 60 * 30);

    if (data?.signedUrl) {
      documentPreviewMap.set(record.id, data.signedUrl);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-4xl font-bold">KYC Review</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Admin panel for reviewing one-time creator verification submissions.
        </p>
      </section>

      {saved ? (
        <p className="max-w-3xl rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          KYC status updated to {saved}.
        </p>
      ) : null}

      {error ? (
        <p className="max-w-3xl rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not update KYC. Please retry.
        </p>
      ) : null}

      <section className="space-y-4">
        {records.length === 0 ? (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
            No KYC submissions found.
          </div>
        ) : (
          records.map((record: any) => {
            const profile: any = profileMap.get(record.user_id);

            return (
              <article
                key={record.id}
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {profile?.full_name || profile?.username || record.legal_name}
                    </h2>
                    <p className="text-sm text-[var(--muted)]">
                      @{profile?.username || "unknown"} | profile role: {profile?.role || "user"}
                    </p>
                  </div>
                  <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                    {record.status}
                  </span>
                </div>

                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-[var(--muted)]">Legal name</dt>
                    <dd className="font-semibold">{record.legal_name}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--muted)]">Country</dt>
                    <dd className="font-semibold">{record.country}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--muted)]">ID number</dt>
                    <dd className="font-semibold">{record.id_number}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--muted)]">Submitted at</dt>
                    <dd className="font-semibold">{new Date(record.submitted_at).toLocaleString()}</dd>
                  </div>
                </dl>

                <p className="mt-3 text-sm">
                  <span className="font-semibold">Document path:</span> {record.document_url}
                </p>

                {documentPreviewMap.get(record.id) ? (
                  <a
                    href={documentPreviewMap.get(record.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-sm font-semibold text-[var(--brand)] underline"
                  >
                    Preview KYC document
                  </a>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={reviewKyc}>
                    <input type="hidden" name="kyc_id" value={record.id} />
                    <input type="hidden" name="decision" value="approved" />
                    <button
                      type="submit"
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Approve
                    </button>
                  </form>

                  <form action={reviewKyc}>
                    <input type="hidden" name="kyc_id" value={record.id} />
                    <input type="hidden" name="decision" value="rejected" />
                    <button
                      type="submit"
                      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
