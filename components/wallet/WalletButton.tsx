"use client";

import { useEffect, useState } from "react";

export function WalletButton() {
  const [status, setStatus] = useState<string>("disconnected");

  useEffect(() => {
    function handleStatusChange(e: Event) {
      const customEvent = e as CustomEvent;
      setStatus(customEvent.detail.status);
    }

    // Ask the widget for its current state just in case it mounted first
    window.dispatchEvent(new Event("wallet-status-request"));
    
    window.addEventListener("wallet-connection-changed", handleStatusChange);
    return () => window.removeEventListener("wallet-connection-changed", handleStatusChange);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("request-wallet-connect"))}
      className={[
        "rounded-full border px-3 py-2 text-xs font-semibold transition md:px-4 md:text-sm",
        status === "connected"
          ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
          : "border-[var(--brand)] bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]",
      ].join(" ")}
    >
      {status === "connected"
        ? "Wallet Connected"
        : status === "connecting"
          ? "Connecting…"
          : "Connect Wallet"}
    </button>
  );
}