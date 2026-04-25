"use client";

import Image from "next/image";
import { useState } from "react";
import { quickFundraiserImage, quickSteps } from "@/lib/constants/home";

export function QuickFundraisersSection() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const activeStep = quickSteps[activeStepIndex];

  const stepImage = quickFundraiserImage;

  const goToPreviousStep = () => {
    setDirection(-1);
    setActiveStepIndex((current) => (current === 0 ? quickSteps.length - 1 : current - 1));
  };

  const goToNextStep = () => {
    setDirection(1);
    setActiveStepIndex((current) => (current === quickSteps.length - 1 ? 0 : current + 1));
  };

  const jumpToStep = (index: number) => {
    setDirection(index > activeStepIndex ? 1 : -1);
    setActiveStepIndex(index);
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8">
      <h2 className="text-center text-4xl font-bold reveal-up">Quick Fundr Fundraisers</h2>
      <p className="mx-auto mt-4 max-w-2xl text-center text-[var(--muted)] reveal-up delay-100">
        Streamline your fundraising process from idea to impact using these
        four guided steps.
      </p>

      <div className="mt-10 overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-4 reveal-zoom lift-hover md:p-8">
        <div className="grid gap-6 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <button
            type="button"
            onClick={goToPreviousStep}
            aria-label="Previous fundraising step"
            suppressHydrationWarning
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-soft)] text-2xl font-semibold text-[var(--brand)] transition hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]"
          >
            ←
          </button>

          <div className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
            <div
              key={activeStep.number}
              className={`space-y-3 ${direction === 1 ? "carousel-slide-next" : "carousel-slide-prev"}`}
            >
              <p className="text-2xl font-semibold text-[var(--brand)]">{activeStep.number}</p>
              <h3 className="text-3xl font-bold">{activeStep.title}</h3>
              <p className="text-[var(--muted)]">{activeStep.description}</p>
              <ul className="mt-5 space-y-2 text-sm text-[var(--muted)]">
                {activeStepIndex === 0 ? (
                  <>
                    <li>Start with a clear fundraising goal</li>
                    <li>Set the campaign purpose before sharing</li>
                  </>
                ) : activeStepIndex === 1 ? (
                  <>
                    <li>Share the link across social channels</li>
                    <li>Reach supporters quickly with a simple story</li>
                  </>
                ) : activeStepIndex === 2 ? (
                  <>
                    <li>Track contributions as they come in</li>
                    <li>Keep transparency visible to every donor</li>
                  </>
                ) : (
                  <>
                    <li>Withdraw once campaign conditions are met</li>
                    <li>Post updates after payout to keep trust high</li>
                  </>
                )}
              </ul>
            </div>

            <div
              key={`${activeStep.number}-image`}
              className={`overflow-hidden rounded-2xl ${direction === 1 ? "carousel-slide-next" : "carousel-slide-prev"}`}
            >
              <Image
                src={stepImage.src}
                alt={stepImage.alt}
                width={1000}
                height={700}
                className="h-64 w-full rounded-2xl object-cover md:h-[18rem]"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={goToNextStep}
            aria-label="Next fundraising step"
            suppressHydrationWarning
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-soft)] text-2xl font-semibold text-[var(--brand)] transition hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]"
          >
            →
          </button>
        </div>

        <div className="mt-8 grid gap-4 border-t border-[var(--line)] pt-6 sm:grid-cols-2 lg:grid-cols-4">
          {quickSteps.map((step, index) => {
            const isActive = index === activeStepIndex;

            return (
              <button
                key={step.number}
                type="button"
                onClick={() => jumpToStep(index)}
                suppressHydrationWarning
                className={`border-l-2 px-3 text-left transition ${
                  isActive
                    ? "border-[var(--brand)] bg-[var(--brand-soft)]/40"
                    : "border-[var(--brand)]/30 hover:bg-[var(--surface-soft)]"
                }`}
              >
                <p className="text-sm font-semibold text-[var(--brand)]">{step.number}</p>
                <h4 className="mt-1 font-semibold">{step.title}</h4>
                <p className="mt-1 text-sm text-[var(--muted)]">{step.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
