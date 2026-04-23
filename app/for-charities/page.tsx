import Link from "next/link";
import Image from "next/image";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const charityBenefits = [
  "Verified campaign profile and trust indicators",
  "Real-time donor updates and milestone communication",
  "Transparent donation flow with on-chain visibility",
  "Team-friendly dashboard for campaign management",
];

export default function ForCharitiesPage() {
  return (
    <div className="bg-[var(--background)] text-[var(--foreground)]">
      <Navbar />
      <ScrollReveal />

      <main>
        <section className="border-b border-[var(--line)] bg-[var(--surface-soft)] py-16 md:py-20">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 md:grid-cols-[1fr_1.05fr] md:px-8 md:items-center">
            <div className="reveal-zoom">
              <Image
                src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1200&q=80"
                alt="Charity volunteers organizing community support"
                width={1200}
                height={800}
                className="h-80 w-full rounded-3xl border border-[var(--line)] object-cover"
              />
            </div>

            <div className="space-y-5 reveal-up delay-100">
              <p className="inline-block rounded-full border border-[var(--brand)] bg-[var(--brand-soft)] px-4 py-1 text-sm font-medium text-[var(--brand-strong)]">
                For Charities
              </p>
              <h1 className="text-4xl font-bold leading-tight md:text-5xl">
                Build trusted fundraising campaigns for lasting social impact.
              </h1>
              <p className="max-w-xl text-[var(--muted)] md:text-lg">
                Give donors clear visibility into goals, progress, and outcomes
                while your team focuses on helping people.
              </p>
              <Link
                href="/how-it-works"
                className="inline-block rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
              >
                Explore Campaign Workflow
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8">
          <h2 className="text-center text-4xl font-bold reveal-up">Why Charities Choose Fundr</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {charityBenefits.map((benefit, index) => (
              <div
                key={benefit}
                className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-5 py-4 text-sm font-medium reveal-up"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                {benefit}
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
