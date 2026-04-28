"use client";

import { useState } from "react";
import { Contract, Operation, Asset } from "@stellar/stellar-sdk";
import { VerifyOnChain } from "@/components/ui/VerifyOnChain";
import { useSorobanIntegration } from "@/hooks/useSorobanIntegration";

interface WithdrawButtonProps {
  contractId: string;
  deadline: string;
}

export function WithdrawButton({ contractId, deadline }: WithdrawButtonProps) {
  const { submitTransaction, isSubmitting } = useSorobanIntegration();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [withdrawnAmount, setWithdrawnAmount] = useState<number | null>(null);

  const isPastDeadline = new Date().getTime() > new Date(deadline).getTime();

  const handleWithdraw = async () => {
    try {
      const contract = new Contract(contractId);

      // Fetch contract XLM balance via Horizon to calculate the 5% platform fee
      const horizonUrl =
        process.env.NEXT_PUBLIC_STELLAR_NETWORK === "PUBLIC"
          ? "https://horizon.stellar.org"
          : "https://horizon-testnet.stellar.org";

      const balRes = await fetch(`${horizonUrl}/accounts/${contractId}`);
      if (!balRes.ok) {
        throw new Error("Could not fetch contract balance. Are there any funds?");
      }
      const balData = await balRes.json();
      const nativeBalStr = balData.balances?.find(
        (b: { asset_type: string; balance: string }) => b.asset_type === "native"
      )?.balance;
      const contractBalance = parseFloat(nativeBalStr || "0");

      if (contractBalance <= 0) {
        throw new Error("No funds available to withdraw.");
      }

      const adminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET_ID;
      if (!adminWallet) throw new Error("Admin wallet not configured.");

      // 5% platform maintenance fee
      const feeAmount = contractBalance * 0.05;
      const feeString = feeAmount.toFixed(7);
      const netAmount = contractBalance - feeAmount;

      const { hash } = await submitTransaction({
        buildOperations: () => {
          return [
            contract.call("withdraw"),
            Operation.payment({
              destination: adminWallet,
              asset: Asset.native(),
              amount: feeString,
            })
          ];
        }
      });

      // Flip into success state
      setTxHash(hash);
      setWithdrawnAmount(netAmount);
    } catch (err: any) {
      console.error(err);
      alert("Withdrawal failed: " + (err.message || "Unknown error"));
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────
  if (txHash && withdrawnAmount !== null) {
    return (
      <div className="mt-6 rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white text-lg font-bold shadow">
            ✓
          </span>
          <div>
            <p className="text-lg font-bold text-emerald-800">Withdrawal Successful!</p>
            <p className="text-xs text-emerald-600">Funds have been transferred to your wallet.</p>
          </div>
        </div>

        {/* Amount breakdown */}
        <div className="mt-4 space-y-2 rounded-xl border border-emerald-200 bg-white/70 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-emerald-700">Amount Withdrawn</span>
            <span className="text-base font-bold text-emerald-900">
              {withdrawnAmount.toFixed(4)} XLM
            </span>
          </div>
          <div className="border-t border-emerald-100" />
          <div className="flex items-center justify-between text-xs text-emerald-600">
            <span>Platform maintenance fee (5%) deducted</span>
            <span>{(withdrawnAmount * 0.0526).toFixed(4)} XLM</span>
          </div>
        </div>

        {/* Transaction verification */}
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-white/70 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-emerald-800">Transaction ID</p>
            <p className="mt-0.5 truncate font-mono text-[10px] text-emerald-600">{txHash}</p>
          </div>
          <VerifyOnChain value={txHash} label="Verify ↗" />
        </div>
      </div>
    );
  }

  // ── Default state ─────────────────────────────────────────────────────────
  return (
    <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
      <h2 className="text-xl font-bold text-emerald-800">Withdraw Funds</h2>
      <p className="mt-2 text-sm text-emerald-700/90">
        If your campaign has successfully met its goal and the deadline has passed, you can withdraw
        your funds here. A small platform maintenance fee (5%) will be automatically sent to the
        admin wallet.
      </p>

      {!isPastDeadline && (
        <p className="mt-3 text-xs font-semibold text-amber-700">
          Note: Your campaign deadline has not passed yet. The smart contract will reject
          withdrawals.
        </p>
      )}

      <div className="mt-4">
        <button
          onClick={handleWithdraw}
          disabled={isSubmitting}
          className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSubmitting ? "Processing..." : "Withdraw Funds"}
        </button>
      </div>
    </div>
  );
}
