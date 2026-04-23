import Image from "next/image";
import { heroConfig } from "@/lib/constants/home";

export function HeroSection() {
  return (
    <section className="grid-soft relative overflow-hidden border-b border-[var(--line)]">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-3xl text-center reveal-up">
          <span className="inline-block rounded-full border border-[var(--brand)] bg-[var(--brand-soft)] px-4 py-1 text-sm font-medium text-[var(--brand-strong)] reveal-up delay-100">
            {heroConfig.badgeText}
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-tight reveal-up delay-200 md:text-6xl">
            {heroConfig.headline}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[var(--muted)] reveal-up delay-300 md:text-lg">
            {heroConfig.description}
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-sm reveal-zoom delay-200 md:p-4">
          <div className="grid gap-2 md:grid-cols-[1.15fr_1fr_1fr_auto]">
            <select className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-3 text-sm outline-none">
              <option>Make a one-time donation</option>
            </select>
            <input
              type="number"
              placeholder="Donation amount"
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-3 text-sm outline-none"
            />
            <select className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-3 text-sm outline-none">
              <option>Donate for a cause</option>
            </select>
            <button className="rounded-xl bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]">
              Donate
            </button>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-[var(--line)] reveal-zoom delay-300">
          <Image
            src={heroConfig.heroImageUrl}
            alt={heroConfig.heroImageAlt}
            width={1600}
            height={900}
            loading="eager"
            fetchPriority="high"
            className="h-[320px] w-full object-cover md:h-[420px]"
          />
        </div>
      </div>
    </section>
  );
}
