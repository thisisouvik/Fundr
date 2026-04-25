import Link from "next/link";

const NETWORK = (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "TESTNET").toUpperCase();
const BASE_URL =
  NETWORK === "PUBLIC"
    ? "https://stellar.expert/explorer/public"
    : "https://stellar.expert/explorer/testnet";

interface VerifyOnChainProps {
  /** A transaction hash (64 hex chars) or contract address (C...) */
  value: string;
  /** Optional label override */
  label?: string;
  /** Compact pill style or full button */
  variant?: "pill" | "button" | "inline";
}

function buildUrl(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("C") && trimmed.length === 56) {
    return `${BASE_URL}/contract/${trimmed}`;
  }
  return `${BASE_URL}/tx/${trimmed}`;
}

export function VerifyOnChain({ value, label, variant = "pill" }: VerifyOnChainProps) {
  if (!value) return null;

  const href = buildUrl(value);
  const text = label ?? "Verify on-chain ↗";

  if (variant === "inline") {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex w-fit items-center gap-1 whitespace-nowrap text-xs font-semibold text-[var(--brand)] underline decoration-dotted underline-offset-2 transition hover:decoration-solid"
      >
        {text}
      </Link>
    );
  }

  if (variant === "button") {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-xl border border-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
        {text}
      </Link>
    );
  }

  // Default: pill
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--brand)]/40 bg-[var(--brand)]/8 px-3 py-1 text-xs font-semibold text-[var(--brand)] transition hover:border-[var(--brand)] hover:bg-[var(--brand)] hover:text-white"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      </svg>
      {text}
    </Link>
  );
}
