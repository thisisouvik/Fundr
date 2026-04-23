import Image from "next/image";
import { quickFundraiserImage, quickSteps } from "@/lib/constants/home";

export function QuickFundraisersSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8">
      <h2 className="text-center text-4xl font-bold reveal-up">Quick Fundr Fundraisers</h2>
      <p className="mx-auto mt-4 max-w-2xl text-center text-[var(--muted)] reveal-up delay-100">
        Streamline your fundraising process from idea to impact using these
        four guided steps.
      </p>

      <div className="mt-10 overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 reveal-zoom lift-hover md:p-8">
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <p className="text-2xl font-semibold text-[var(--brand)]">02</p>
            <h3 className="mt-2 text-3xl font-bold">Share to your friends</h3>
            <p className="mt-3 text-[var(--muted)]">
              Invite your trusted network to contribute and amplify your
              campaign through social channels and direct sharing.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-[var(--muted)]">
              <li>Easy to Donate with secure wallet confirmation</li>
              <li>Clear campaign transparency for every donor</li>
            </ul>
          </div>
          <Image
            src={quickFundraiserImage.src}
            alt={quickFundraiserImage.alt}
            width={1000}
            height={700}
            className="h-64 w-full rounded-2xl object-cover"
          />
        </div>

        <div className="mt-8 grid gap-4 border-t border-[var(--line)] pt-6 sm:grid-cols-2 lg:grid-cols-4">
          {quickSteps.map((step, index) => (
            <article
              key={step.number}
              className="border-l-2 border-[var(--brand)] pl-3 reveal-up"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <p className="text-sm font-semibold text-[var(--brand)]">{step.number}</p>
              <h4 className="mt-1 font-semibold">{step.title}</h4>
              <p className="mt-1 text-sm text-[var(--muted)]">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
