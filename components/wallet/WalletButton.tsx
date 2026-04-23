"use client";

export function WalletButton() {
  return (
    <button
      type="button"
      className="rounded-full border border-[var(--brand)] bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--brand-strong)] md:px-4 md:text-sm"
    >
      Connect Wallet
    </button>
  );
}