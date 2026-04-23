"use client";

import Link from "next/link";
import { useState } from "react";
import { BalanceDisplay } from "@/components/wallet/BalanceDisplay";
import { WalletButton } from "@/components/wallet/WalletButton";

const navLinks = [
  { label: "For Individuals", href: "/for-individuals" },
  { label: "For Charities", href: "/for-charities" },
  { label: "How It Works", href: "/how-it-works" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--background)]/90 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-8">
        <Link href="/" className="text-2xl font-bold tracking-tight text-[var(--brand)]">
          Fundr
        </Link>

        <ul className="hidden items-center gap-8 text-sm text-[var(--foreground)] lg:flex">
          {navLinks.map((link) => (
            <li key={link.label}>
              <Link href={link.href} className="transition hover:text-[var(--brand)]">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <BalanceDisplay />
          <WalletButton />
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] text-lg font-semibold text-[var(--foreground)] lg:hidden"
            onClick={() => setMobileOpen((current) => !current)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? "X" : "="}
          </button>
        </div>
      </nav>

      {mobileOpen ? (
        <div className="border-t border-[var(--line)] bg-[var(--surface)] px-4 py-4 lg:hidden">
          <ul className="space-y-2 text-sm text-[var(--foreground)]">
            {navLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl border border-[var(--line)] px-4 py-3 transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </header>
  );
}