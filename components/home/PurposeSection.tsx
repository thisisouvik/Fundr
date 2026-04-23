import Image from "next/image";
import { purposeCards } from "@/lib/constants/home";

export function PurposeSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8">
      <div className="grid gap-8 md:grid-cols-2 md:items-end">
        <h2 className="text-4xl font-bold leading-tight reveal-up">What&apos;s the purpose of Fundr?</h2>
        <p className="text-[var(--muted)] reveal-up delay-100">
          A transparent funding platform where communities can launch, support,
          and track impact-driven campaigns with confidence.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {purposeCards.map((card, index) => (
          <article
            key={card.title}
            className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] reveal-zoom lift-hover"
            style={{ animationDelay: `${index * 120}ms` }}
          >
            <Image
              src={card.imageUrl}
              alt={card.imageAlt}
              width={1200}
              height={720}
              className="h-56 w-full object-cover"
            />
            <div className="p-5">
              <h3 className="text-2xl font-semibold">{card.title}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{card.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
