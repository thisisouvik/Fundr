import Image from "next/image";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const steps = [
  {
    id: "01",
    title: "Create Campaign",
    details:
      "Set your goal, timeline, and story. Add visuals that communicate urgency and purpose.",
  },
  {
    id: "02",
    title: "Share Campaign",
    details:
      "Publish your link and invite supporters across social channels, groups, and direct messages.",
  },
  {
    id: "03",
    title: "Track Donations",
    details:
      "Monitor progress, donor count, and campaign metrics with a transparent funding timeline.",
  },
  {
    id: "04",
    title: "Deliver Impact",
    details:
      "Withdraw and deploy funds according to campaign terms, then post updates to keep trust high.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="bg-[var(--background)] text-[var(--foreground)]">
      <Navbar />
      <ScrollReveal />

      <main>
        <section className="grid-soft border-b border-[var(--line)] py-16 md:py-20">
          <div className="mx-auto w-full max-w-6xl px-4 md:px-8 text-center">
            <p className="inline-block rounded-full border border-[var(--brand)] bg-[var(--brand-soft)] px-4 py-1 text-sm font-medium text-[var(--brand-strong)] reveal-up">
              How It Works
            </p>
            <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-bold leading-tight reveal-up delay-100 md:text-6xl">
              From campaign launch to measurable impact in four clear steps.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-[var(--muted)] reveal-up delay-200 md:text-lg">
              Fundr combines friendly campaign setup with transparent progress
              tracking to make fundraising reliable for everyone.
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8">
          <div className="grid gap-8 md:grid-cols-[1fr_1.15fr] md:items-start">
            <div className="reveal-zoom">
              <Image
                src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80"
                alt="Team collaborating on fundraising campaign strategy"
                width={1200}
                height={800}
                className="h-96 w-full rounded-3xl border border-[var(--line)] object-cover"
              />
            </div>

            <div className="space-y-4">
              {steps.map((step, index) => (
                <article
                  key={step.id}
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 reveal-up lift-hover"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <p className="text-sm font-semibold text-[var(--brand)]">{step.id}</p>
                  <h2 className="mt-1 text-2xl font-semibold">{step.title}</h2>
                  <p className="mt-2 text-sm text-[var(--muted)]">{step.details}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
