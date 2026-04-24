"use client";

/**
 * Client Component — owns the form DOM so React 19 can attach event handlers
 * (e.g. the internal onChange that <select defaultValue> generates).
 * The actual form submission is handled by the server action passed via `action` prop.
 */

const ERROR_MESSAGES: Record<string, string> = {
  save: "Could not save campaign. Please try again.",
  no_wallet: "You must link a Stellar wallet in your profile before creating a campaign.",
  onchain: "On-chain registration failed. Check that your wallet is funded on Testnet and try again.",
  official_link: "Official campaign link must start with http:// or https://",
  images_count: "Upload 4 to 5 campaign images.",
  images_type: "Campaign images must be image files.",
  images_size: "Each campaign image must be 4 MB or smaller.",
  images_upload: "Campaign image upload failed. Please try again.",
  proof_type: "Proof file must be an image or a PDF file.",
  proof_size: "Proof file must be 6 MB or smaller.",
  proof_upload: "Proof file upload failed. Please try again.",
  invalid: "Please complete all required fields correctly.",
};

interface Props {
  action: (formData: FormData) => Promise<void>;
  error: string;
}

export default function CreateCampaignForm({ action, error }: Props) {
  const errorMessage = ERROR_MESSAGES[error] ?? (error ? "Please complete all required fields correctly." : null);

  return (
    <section className="max-w-3xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
      <form action={action} className="space-y-4">
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
          <p className="text-xs text-[var(--muted)]">Each image can be up to 4 MB. Stored in Supabase Storage.</p>
        </label>

        {errorMessage ? (
          <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600">
            {errorMessage}
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
  );
}
