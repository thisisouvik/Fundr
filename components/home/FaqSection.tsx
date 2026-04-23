import { faqItems } from "@/lib/constants/home";

export function FaqSection() {
  return (
    <section className="border-y border-[var(--line)] bg-[var(--surface)] py-16">
      <div className="mx-auto w-full max-w-4xl px-4 md:px-8">
        <h2 className="text-center text-4xl font-bold reveal-up">Frequently Asked Questions</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-[var(--muted)] reveal-up delay-100">
          Everything donors and organizers usually ask before launching or
          supporting a campaign on Fundr.
        </p>

        <div className="mt-10 space-y-4">
          {faqItems.map((item, index) => (
            <details
              key={item.question}
              className="group rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-5 reveal-up"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <summary className="cursor-pointer list-none pr-4 text-lg font-semibold">
                {item.question}
              </summary>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
