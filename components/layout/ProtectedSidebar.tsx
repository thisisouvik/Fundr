"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { FundraiserKycRow, ProfileRow } from "@/types/supabase";

interface NavItem {
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { label: "Home", href: "/dashboard" },
  { label: "Create Campaign", href: "/fundraising" },
  { label: "Campaign Performance", href: "/dashboard/performance" },
  { label: "Fundraised History", href: "/history" },
  { label: "Profile and Settings", href: "/settings" },
];

export function ProtectedSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut, user } = useAuth();
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [statusLabel, setStatusLabel] = useState("KYC: checking status...");
  const [statusTone, setStatusTone] = useState<"neutral" | "info" | "success" | "danger">("neutral");
  const [hasCreatorAccess, setHasCreatorAccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const links = useMemo(() => {
    if (!isAdmin) {
      return navItems;
    }

    return [
      { label: "Admin Panel", href: "/admin" },
      { label: "KYC Review", href: "/admin/kyc" },
      { label: "Campaign Moderation", href: "/admin/campaigns" },
      { label: "Settings", href: "/settings" },
    ];
  }, [isAdmin]);

  useEffect(() => {
    let cancelled = false;

    const loadAccessStatus = async () => {
      if (!user) {
        if (!cancelled) {
          setIsStatusLoading(false);
          setStatusLabel("Sign in required");
          setStatusTone("neutral");
          setHasCreatorAccess(false);
          setIsAdmin(false);
        }
        return;
      }

      setIsStatusLoading(true);

      const supabase = createClient();
      const profileResponse = await supabase
        .from("profiles")
        .select("role, is_verified")
        .eq("id", user.id)
        .maybeSingle();
      const kycResponse = await supabase
        .from("fundraiser_kyc")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

      const profile = profileResponse.data as Pick<ProfileRow, "role" | "is_verified"> | null;
      const kyc = kycResponse.data as Pick<FundraiserKycRow, "status"> | null;

      if (cancelled) {
        return;
      }

      setIsAdmin(profile?.role === "admin");

      if (profile?.is_verified && (profile.role === "creator" || profile.role === "admin")) {
        setStatusLabel(profile.role === "admin" ? "Admin access active" : "Creator access active");
        setStatusTone("success");
        setHasCreatorAccess(true);
      } else if (kyc?.status === "pending") {
        setStatusLabel("KYC pending admin review");
        setStatusTone("info");
        setHasCreatorAccess(false);
      } else if (kyc?.status === "rejected") {
        setStatusLabel("KYC rejected, contact support");
        setStatusTone("danger");
        setHasCreatorAccess(false);
      } else if (kyc?.status === "approved") {
        setStatusLabel("KYC approved, access updating");
        setStatusTone("info");
        setHasCreatorAccess(false);
      } else {
        setStatusLabel("KYC not submitted");
        setStatusTone("neutral");
        setHasCreatorAccess(false);
      }

      setIsStatusLoading(false);
    };

    void loadAccessStatus();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const statusClassName =
    statusTone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : statusTone === "info"
        ? "border-sky-200 bg-sky-50 text-sky-700"
        : statusTone === "danger"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-[var(--line)] bg-[var(--surface-soft)] text-[var(--muted)]";

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="mb-4 border-b border-[var(--line)] pb-4">
        <Link href="/dashboard" className="text-2xl font-bold tracking-tight text-[var(--brand)]">
          Fundr
        </Link>
        <p className="mt-1 text-sm text-[var(--muted)]">{isAdmin ? "Admin workspace" : "Creator workspace"}</p>
        <Link
          href={isAdmin ? "/admin" : "/settings"}
          className={`mt-3 block rounded-xl border px-3 py-2 text-xs font-semibold ${statusClassName}`}
        >
          {isStatusLoading ? "KYC: checking status..." : statusLabel}
        </Link>
      </div>

      <nav aria-label="Protected navigation" className="space-y-2">
        {links.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const kycLockedRoutes = ["/fundraising", "/dashboard/performance", "/history"];
          const isKycLockedRoute = kycLockedRoutes.includes(item.href);
          const isKycLocked = isKycLockedRoute && !hasCreatorAccess;
          const baseClass = isActive
            ? "border border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]"
            : "border border-transparent hover:border-[var(--line)] hover:bg-[var(--surface-soft)]";
          const lockClass = isKycLocked
            ? " text-[var(--muted)] opacity-85"
            : "";

          if (isKycLocked) {
            return (
              <button
                type="button"
                key={item.href}
                disabled
                aria-disabled="true"
                className={`block w-full cursor-not-allowed rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${baseClass}${lockClass}`}
              >
                <span className="inline-flex items-center gap-2">
                  <span>{item.label}</span>
                  <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                    Locked
                  </span>
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-xl px-3 py-2 text-sm font-semibold transition ${baseClass}${lockClass}`}
            >
              <span className="inline-flex items-center gap-2">
                <span>{item.label}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={handleSignOut}
        className="mt-5 w-full rounded-xl border border-[var(--line)] px-3 py-2 text-left text-sm font-semibold transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
      >
        Sign Out
      </button>
    </div>
  );
}