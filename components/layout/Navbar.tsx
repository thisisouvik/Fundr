"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BalanceDisplay } from "@/components/wallet/BalanceDisplay";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import Image from "next/image";


const navLinks = [
  { label: "For Individuals", href: "/for-individuals" },
  { label: "For Charities", href: "/for-charities" },
  { label: "How It Works", href: "/how-it-works" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();
  const { profile, isLoading: isProfileLoading } = useProfile();

  const role = profile?.role ?? "user";
  const isAuthReady = !isLoading && !isProfileLoading;

  const privateLinks = user
    ? [
        { label: "Dashboard", href: "/dashboard" },
        { label: "Settings", href: "/settings" },
      ]
    : [];

  const creatorLinks =
    role === "creator" || role === "admin"
      ? [{ label: "Creator Panel", href: "/dashboard" }]
      : [];

  const allLinks = [...navLinks, ...privateLinks, ...creatorLinks];

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--background)]/90 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[var(--brand)]">
          <Image src="/icon.png" alt="Fundr Logo" width={32} height={32} className="h-8 w-8" priority />
          <span>Fundr</span>
        </Link>

        <ul className="hidden items-center gap-8 text-sm text-[var(--foreground)] lg:flex">
          {allLinks.map((link) => (
            <li key={link.label}>
              <Link href={link.href} className="transition hover:text-[var(--brand)]">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 md:gap-3">
          {user ? <BalanceDisplay /> : null}
          {user ? <WalletButton /> : null}

          {isAuthReady ? (
            user ? (
              <button
                type="button"
                onClick={handleSignOut}
                suppressHydrationWarning
                className="hidden rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold transition hover:border-[var(--brand)] hover:text-[var(--brand)] md:inline-flex md:text-sm"
              >
                Sign Out
              </button>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Link
                  href="/campaigns"
                  className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold transition hover:border-[var(--brand)] hover:text-[var(--brand)] md:text-sm"
                >
                  Fund
                </Link>
                <Link
                  href="/login?next=/fundraising"
                  className="rounded-full border border-[var(--brand)] bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--brand-strong)] md:text-sm"
                >
                  Create Campaign
                </Link>
              </div>
            )
          ) : null}

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] text-lg font-semibold text-[var(--foreground)] lg:hidden"
            onClick={() => setMobileOpen((current) => !current)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            suppressHydrationWarning
          >
            {mobileOpen ? "X" : "="}
          </button>
        </div>
      </nav>

      {mobileOpen ? (
        <div className="border-t border-[var(--line)] bg-[var(--surface)] px-4 py-4 lg:hidden">
          <ul className="space-y-2 text-sm text-[var(--foreground)]">
            {allLinks.map((link) => (
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

            {isAuthReady && !user ? (
              <li className="grid grid-cols-2 gap-2 pt-2">
                <Link
                  href="/campaigns"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl border border-[var(--line)] px-4 py-3 text-center font-semibold"
                >
                  Fund
                </Link>
                <Link
                  href="/login?next=/fundraising"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl border border-[var(--brand)] bg-[var(--brand)] px-4 py-3 text-center font-semibold text-white"
                >
                  Create Campaign
                </Link>
              </li>
            ) : null}

            {isAuthReady && user ? (
              <li className="pt-2">
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={async () => {
                    await handleSignOut();
                    setMobileOpen(false);
                  }}
                  className="w-full rounded-xl border border-[var(--line)] px-4 py-3 text-left font-semibold"
                >
                  Sign Out
                </button>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </header>
  );
}