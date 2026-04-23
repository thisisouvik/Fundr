import { socialProof } from "@/lib/constants/home";

export function SocialProofSection() {
  return (
    <section className="border-b border-[var(--line)] bg-[var(--surface)]">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-8 px-4 py-10 md:px-8">
        <div className="space-y-1 reveal-up">
          <p className="font-semibold">{socialProof.source}</p>
          <p className="text-sm text-[var(--muted)]">{socialProof.ratingSummary}</p>
        </div>
        <blockquote className="max-w-xl text-lg font-medium reveal-up delay-100">
          &ldquo;{socialProof.quote}&rdquo;
        </blockquote>
        <p className="text-sm text-[var(--muted)] reveal-up delay-200">{socialProof.author}</p>
      </div>
    </section>
  );
}
