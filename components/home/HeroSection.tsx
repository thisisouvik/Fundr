"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { heroConfig } from "@/lib/constants/home";

export function HeroSection() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const isCreatorUser = Boolean(user) && (profile?.role === "creator" || profile?.role === "admin");

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

        <div className="mt-10 grid gap-4 md:grid-cols-[1.3fr_1fr]">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm reveal-zoom delay-200 md:p-6">
            <p className="text-sm font-semibold text-[var(--brand)]">Choose your path</p>
            <h2 className="mt-2 text-2xl font-bold">Fund a cause or launch your own campaign</h2>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Use the public Fund flow to support an existing campaign, or go to the creator portal to start a new one.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/fund"
                className="rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
              >
                Fund
              </Link>
              <Link
                href={isCreatorUser ? "/dashboard" : "/fundraising"}
                className="rounded-full border border-[var(--brand)] px-5 py-3 text-sm font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white"
              >
                {isCreatorUser ? "Dashboard" : "Start a Campaign"}
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-5 reveal-zoom delay-300">
            <p className="text-sm font-semibold">Donation basics</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
              <li>Anonymous support available</li>
              <li>Name and email required if not anonymous</li>
              <li>Minimum fund amount: 1 XLM</li>
            </ul>
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
