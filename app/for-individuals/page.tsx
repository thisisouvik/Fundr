import Link from "next/link";
import Image from "next/image";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const personalUseCases = [
  {
    title: "Medical Emergency",
    description: "Raise urgent funds quickly and transparently with milestone updates.",
  },
  {
    title: "Education Support",
    description: "Fund tuition, books, and skills programs with community backing.",
  },
  {
    title: "Memorial & Legacy",
    description: "Gather meaningful contributions for remembrance or family relief.",
  },
];

export default function ForIndividualsPage() {
  return (
    <div className="bg-[var(--background)] text-[var(--foreground)]">
      <Navbar />
      <ScrollReveal />

      <main>
        <section className="grid-soft border-b border-[var(--line)] py-16 md:py-20">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 md:grid-cols-[1.15fr_1fr] md:px-8 md:items-center">
            <div className="space-y-5 reveal-up">
              <p className="inline-block rounded-full border border-[var(--brand)] bg-[var(--brand-soft)] px-4 py-1 text-sm font-medium text-[var(--brand-strong)]">
                For Individuals
              </p>
              <h1 className="text-4xl font-bold leading-tight md:text-5xl">
                Launch personal fundraisers in minutes.
              </h1>
              <p className="max-w-xl text-[var(--muted)] md:text-lg">
                Create compelling campaigns, share them quickly, and track every
                donation with confidence on Fundr.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  href="/how-it-works"
                  className="rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
                >
                  See How It Works
                </Link>
                <button
                  type="button"
                  className="rounded-full border border-[var(--brand)] px-5 py-3 text-sm font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white"
                >
                  Start a Campaign
                </button>
              </div>
            </div>

            <div className="reveal-zoom delay-100">
              <Image
                src="https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80"
                alt="Friends planning a personal fundraiser"
                width={1200}
                height={800}
                className="h-80 w-full rounded-3xl border border-[var(--line)] object-cover"
              />
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8">
          <h2 className="text-center text-4xl font-bold reveal-up">Most Popular Individual Campaign Types</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {personalUseCases.map((item, index) => (
              <article
                key={item.title}
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 reveal-up lift-hover"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm text-[var(--muted)]">{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
