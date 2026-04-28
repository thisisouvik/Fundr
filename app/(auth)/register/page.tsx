export const dynamic = 'force-dynamic';
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsSubmitting(false);
      return;
    }

    router.push("/onboarding");
    router.refresh();
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join Fundr and start building campaigns that create real impact."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Password</span>
          <div className="relative">
            <input
              type={isPasswordVisible ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 pr-11 text-sm outline-none"
            />
            <button
              type="button"
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
              onClick={() => setIsPasswordVisible((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              {isPasswordVisible ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3l18 18" />
                  <path d="M10.58 10.58a2 2 0 1 0 2.83 2.83" />
                  <path d="M16.68 16.67A10.94 10.94 0 0 1 12 17C7 17 2.73 14.11 1 10c.73-1.73 1.9-3.24 3.37-4.4" />
                  <path d="M9.88 5.09A10.95 10.95 0 0 1 12 5c5 0 9.27 2.89 11 7a11.76 11.76 0 0 1-2.16 3.19" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Confirm Password</span>
          <div className="relative">
            <input
              type={isConfirmVisible ? "text" : "password"}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              minLength={8}
              required
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 pr-11 text-sm outline-none"
            />
            <button
              type="button"
              aria-label={isConfirmVisible ? "Hide confirm password" : "Show confirm password"}
              onClick={() => setIsConfirmVisible((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              {isConfirmVisible ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3l18 18" />
                  <path d="M10.58 10.58a2 2 0 1 0 2.83 2.83" />
                  <path d="M16.68 16.67A10.94 10.94 0 0 1 12 17C7 17 2.73 14.11 1 10c.73-1.73 1.9-3.24 3.37-4.4" />
                  <path d="M9.88 5.09A10.95 10.95 0 0 1 12 5c5 0 9.27 2.89 11 7a11.76 11.76 0 0 1-2.16 3.19" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:opacity-60"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <div className="mt-5 text-sm">
        <Link href="/login" className="text-[var(--brand)] hover:underline">
          Already have an account? Sign in
        </Link>
      </div>
    </AuthCard>
  );
}
