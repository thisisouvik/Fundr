"use client";

/**
 * WalletWidget — fixed top-right floating wallet panel.
 * Collapsed: compact pill showing status + address/connect label.
 * Expanded: full card with live XLM balance, role metric, copy, explorer.
 *
 * Uses @stellar/freighter-api for robust extension detection and connection.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  isConnected,
  setAllowed,
  getAddress,
  isAllowed,
} from "@stellar/freighter-api";

interface Props {
  role: "funder" | "fundraiser" | "admin";
  serverAmount: number;
  savedWallet?: string | null;
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

const NETWORK = (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "TESTNET").toUpperCase();
const HORIZON_URL =
  NETWORK === "PUBLIC"
    ? "https://horizon.stellar.org"
    : "https://horizon-testnet.stellar.org";

function truncate(a: string) {
  return `${a.slice(0, 6)}...${a.slice(-4)}`;
}
function formatXlm(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export default function WalletWidget({ role, serverAmount, savedWallet }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [freighterReady, setFreighterReady] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Freighter detection using the official API ── */
  useEffect(() => {
    let tries = 0;
    const check = async () => {
      const ready = await isConnected();
      if (ready) {
        setFreighterReady(true);
        if (pollRef.current) clearInterval(pollRef.current);
      } else {
        tries++;
        if (tries >= 10 && pollRef.current) {
          clearInterval(pollRef.current);
        }
      }
    };
    check();
    pollRef.current = setInterval(check, 500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  /* ── Fetch live XLM balance ── */
  const fetchBalance = useCallback(async (addr: string) => {
    try {
      const res = await fetch(`${HORIZON_URL}/accounts/${addr}`);
      if (!res.ok) { setBalance("0.0000"); return; }
      const data = await res.json();
      const native = (data.balances ?? []).find((b: { asset_type: string; balance: string }) => b.asset_type === "native");
      setBalance(native ? parseFloat(native.balance).toFixed(4) : "0.0000");
    } catch {
      setBalance("0.0000");
    }
  }, []);

  /* ── Auto-reconnect after Freighter is detected ── */
  useEffect(() => {
    if (!freighterReady) return;
    const attemptReconnect = async () => {
      const allowed = await isAllowed();
      if (allowed) {
        const { address: addr, error } = await getAddress();
        if (addr && !error) {
          setAddress(addr);
          setStatus("connected");
          fetchBalance(addr);
        }
      }
    };
    attemptReconnect();
  }, [freighterReady, fetchBalance]);

  /* ── Close panel when clicking outside ── */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ── Connect ── */
  const connect = useCallback(async () => {
    if (!freighterReady) {
      window.open("https://freighter.app", "_blank");
      return;
    }
    setStatus("connecting");
    setOpen(true);
    try {
      await setAllowed();
      const { address: addr, error } = await getAddress();
      if (error || !addr) {
        setStatus("error");
        return;
      }
      setAddress(addr);
      setStatus("connected");
      fetchBalance(addr);
    } catch {
      setStatus("error");
    }
  }, [freighterReady, fetchBalance]);

  /* ── Listen for external connect requests ── */
  useEffect(() => {
    function handleExternalConnect() {
      if (status !== "connected") {
        connect();
      } else {
        setOpen(true);
      }
    }
    window.addEventListener("request-wallet-connect", handleExternalConnect);
    return () => window.removeEventListener("request-wallet-connect", handleExternalConnect);
  }, [connect, status]);

  /* ── Dispatch status for other components (like WalletButton) ── */
  useEffect(() => {
    const dispatchStatus = () => {
      window.dispatchEvent(
        new CustomEvent("wallet-connection-changed", {
          detail: { status, address },
        })
      );
    };

    dispatchStatus(); // Initial sync
    window.addEventListener("wallet-status-request", dispatchStatus);
    return () => window.removeEventListener("wallet-status-request", dispatchStatus);
  }, [status, address]);

  /* ── Disconnect ── */
  const disconnect = useCallback(() => {
    setAddress(null);
    setBalance(null);
    setStatus("disconnected");
  }, []);

  /* ── Copy address ── */
  const copyAddress = useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [address]);

  /* ── Derived ── */
  const roleLabel =
    role === "fundraiser" ? "Total Received" :
    role === "funder"     ? "Total Funded"   : "Platform Volume";

  const networkLabel = NETWORK === "PUBLIC" ? "Mainnet" : "Testnet";
  const networkColor = NETWORK === "PUBLIC" ? "text-emerald-400" : "text-amber-400";

  const dotColor =
    status === "connected"  ? "bg-emerald-400" :
    status === "connecting" ? "bg-amber-400 animate-pulse" :
    status === "error"      ? "bg-red-400" : "bg-zinc-400";

  const pillLabel =
    status === "connected" && address  ? truncate(address)    :
    status === "connecting"            ? "Connecting…"        :
    freighterReady                     ? "Connect Wallet"     : "Connect Wallet";

  const arrowIcon = open ? "▲" : "▼";

  return (
    /* Fixed: top-right, above sidebar/content, z-50 */
    <div
      ref={panelRef}
      className="fixed top-4 right-4 z-50 flex flex-col items-end gap-0"
    >
      {/* ── Collapsed pill / toggle button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold shadow-lg backdrop-blur transition",
          status === "connected"
            ? "border-emerald-500/30 bg-[var(--surface)] text-[var(--foreground)] hover:border-emerald-500/60"
            : "border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--brand)]",
        ].join(" ")}
      >
        {/* Stellar mark */}
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--brand)] text-white text-xs font-bold select-none">
          ✦
        </span>

        {/* Status dot */}
        <span className={`h-2 w-2 rounded-full ${dotColor}`} />

        {/* Label — hide on very small screens */}
        <span className="hidden sm:inline max-w-[130px] truncate">{pillLabel}</span>

        {/* Network badge */}
        <span className={`hidden md:inline text-[10px] font-medium ${networkColor}`}>
          {networkLabel}
        </span>

        {/* Chevron */}
        <span className="text-[10px] text-[var(--muted)]">{arrowIcon}</span>
      </button>

      {/* ── Expanded panel ── */}
      {open && (
        <div className="mt-2 w-[300px] sm:w-[320px] rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-2xl overflow-hidden">
          {/* Panel header */}
          <div
            className={[
              "px-4 py-3 flex items-center justify-between",
              status === "connected" ? "bg-emerald-500/5 border-b border-emerald-500/10" : "border-b border-[var(--line)]",
            ].join(" ")}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand)] text-white text-xs font-bold">
                ✦
              </span>
              <div>
                <p className="text-xs font-semibold leading-tight">Stellar Wallet</p>
                <p className={`text-[10px] font-medium ${networkColor}`}>{networkLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-2.5 py-0.5 text-[11px] font-medium">
              <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
              {status === "connected" ? "Connected" :
               status === "connecting" ? "Connecting…" :
               status === "error" ? "Error" : "Not connected"}
            </div>
          </div>

          <div className="p-4 space-y-3">
            {status === "connected" && address ? (
              <>
                {/* XLM Balance */}
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3">
                  <p className="text-[11px] text-[var(--muted)]">Wallet Balance</p>
                  <p className="mt-0.5 text-2xl font-bold tracking-tight">
                    {balance ?? "…"}
                    <span className="ml-1 text-sm font-semibold text-[var(--muted)]">XLM</span>
                  </p>
                </div>

                {/* Role metric */}
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-[var(--muted)]">{roleLabel}</p>
                    <p className="mt-0.5 text-base font-bold">{formatXlm(serverAmount)} XLM</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-[var(--brand)]/15 flex items-center justify-center">
                    <span className="text-[var(--brand)] text-xs">
                      {role === "funder" ? "↑" : role === "fundraiser" ? "↓" : "≈"}
                    </span>
                  </div>
                </div>

                {/* Address row */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyAddress}
                    className="flex flex-1 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-left text-[11px] font-mono text-[var(--muted)] transition hover:border-[var(--brand)] hover:text-[var(--foreground)]"
                  >
                    <span className="truncate">{truncate(address)}</span>
                    <span className="ml-auto shrink-0 text-[10px]">{copied ? "✓" : "Copy"}</span>
                  </button>
                  <a
                    href={`https://stellar.expert/explorer/${NETWORK === "PUBLIC" ? "public" : "testnet"}/account/${address}`}
                    target="_blank"
                    rel="noreferrer"
                    title="View on Stellar Expert"
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] text-[11px] text-[var(--muted)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                  >
                    ↗
                  </a>
                </div>

                {/* Wallet mismatch */}
                {savedWallet && savedWallet !== address && (
                  <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                    Connected wallet differs from your profile wallet.
                  </p>
                )}

                {/* Disconnect */}
                <button
                  onClick={disconnect}
                  className="w-full rounded-xl border border-[var(--line)] py-2 text-xs font-semibold text-[var(--muted)] transition hover:border-red-300 hover:text-red-500"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <>
                {/* Placeholder balance */}
                <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-4 text-center">
                  <p className="text-xl font-bold text-[var(--muted)]">— XLM</p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">Connect wallet to see balance</p>
                </div>

                {/* Role metric — still shown from server data */}
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-[var(--muted)]">{roleLabel}</p>
                    <p className="mt-0.5 text-base font-bold">{formatXlm(serverAmount)} XLM</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-[var(--brand)]/10 flex items-center justify-center">
                    <span className="text-[var(--brand)] text-xs">
                      {role === "funder" ? "↑" : role === "fundraiser" ? "↓" : "≈"}
                    </span>
                  </div>
                </div>

                {/* Connect button */}
                <button
                  onClick={connect}
                  disabled={status === "connecting"}
                  className="w-full rounded-xl bg-[var(--brand)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)] disabled:opacity-60"
                >
                  {status === "connecting"
                    ? "Connecting…"
                    : freighterReady
                      ? "Connect Freighter"
                      : "Connect Wallet"}
                </button>

                {!freighterReady && (
                  <p className="text-center text-[11px] text-[var(--muted)]">
                    Need Freighter?{" "}
                    <a href="https://freighter.app" target="_blank" rel="noreferrer" className="text-[var(--brand)] underline">
                      Install the extension
                    </a>
                  </p>
                )}

                {status === "error" && (
                  <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-[11px] text-red-600 text-center">
                    Connection failed. Please try again.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
