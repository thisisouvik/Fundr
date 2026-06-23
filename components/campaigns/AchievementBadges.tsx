interface AchievementBadge {
  id: string;
  label: string;
  description: string;
  earned: boolean;
}

interface AchievementBadgesProps {
  badges: AchievementBadge[];
}

export function AchievementBadges({ badges }: AchievementBadgesProps) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">On-chain Achievement Badges</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Badges are computed from the campaign contract, creator status, and funding milestones.
          </p>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">
          Auto-generated
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {badges.map((badge) => (
          <article
            key={badge.id}
            className={`rounded-2xl border p-4 transition ${
              badge.earned
                ? "border-emerald-300 bg-emerald-50/80 text-emerald-950"
                : "border-[var(--line)] bg-[var(--surface-soft)] text-[var(--foreground)]"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">{badge.label}</h3>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  badge.earned
                    ? "bg-emerald-600 text-white"
                    : "bg-[var(--line)] text-[var(--muted)]"
                }`}
              >
                {badge.earned ? "Earned" : "Pending"}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-inherit/80">{badge.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}