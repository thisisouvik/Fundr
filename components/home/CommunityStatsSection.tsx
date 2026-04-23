import { communityStats } from "@/lib/constants/home";

export function CommunityStatsSection() {
  return (
    <section className="bg-[var(--brand)] py-16 text-white">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
        <div className="mx-auto max-w-2xl text-center reveal-up">
          <h2 className="text-4xl font-bold">A Vast User Community!</h2>
          <p className="mt-3 text-white/85">
            Thanks to our free online fundraising model, even the smallest
            donations can create extraordinary outcomes.
          </p>
        </div>

        <div className="mt-10 grid gap-8 text-center sm:grid-cols-2 lg:grid-cols-4">
          {communityStats.map((stat, index) => (
            <div key={stat.label} className="reveal-up" style={{ animationDelay: `${index * 100}ms` }}>
              <p className="text-4xl font-bold">{stat.value}</p>
              <p className="mt-2 text-sm text-white/80">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
