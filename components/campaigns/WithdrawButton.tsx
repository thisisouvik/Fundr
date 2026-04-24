"use client";

import { useState } from "react";
import { isConnected, isAllowed, getAddress, signTransaction } from "@stellar/freighter-api";
import { rpc, Contract, TransactionBuilder, Transaction, Operation, Asset } from "@stellar/stellar-sdk";
import { getRpcServer, getNetworkPassphrase, waitForSorobanTx } from "@/lib/stellar/soroban";
import { VerifyOnChain } from "@/components/ui/VerifyOnChain";

interface WithdrawButtonProps {
  contractId: string;
  deadline: string;
  goalXlm: number;
}

export function WithdrawButton({ contractId, deadline, goalXlm }: WithdrawButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Check if deadline has passed
  const isPastDeadline = new Date().getTime() > new Date(deadline).getTime();

  const handleWithdraw = async () => {
    setIsSubmitting(true);
    setTxHash(null);

    try {
      if (!(await isConnected())) {
        alert("Freighter is not installed.");
        setIsSubmitting(false);
        return;
      }
      if (!(await isAllowed())) {
        alert("Please authorize Fundr in Freighter.");
        setIsSubmitting(false);
        return;
      }

      const walletAddressObj = await getAddress();
      if (!walletAddressObj || !walletAddressObj.address) {
        alert("Could not get wallet address.");
        setIsSubmitting(false);
        return;
      }
      const creatorAddress = walletAddressObj.address;

      // Use shared helpers — standard Contract class-based interaction
      const server = getRpcServer();
      const networkPassphrase = getNetworkPassphrase();
      const creatorAccount = await server.getAccount(creatorAddress);
      const contract = new Contract(contractId);

      // We need to fetch the contract's balance or total pledged.
      // We can use the get_state function to see how much was pledged.
      const txSim = new TransactionBuilder(creatorAccount, { fee: "100", networkPassphrase })
        .addOperation(contract.call("get_state"))
        .setTimeout(300)
        .build();
        
      const simResult = await server.simulateTransaction(txSim);
      if (rpc.Api.isSimulationError(simResult)) {
        throw new Error("Simulation failed. Contract might not be fully initialized.");
      }
      // Actually we just execute withdraw directly.
      // But we need to know the amount to calculate the platform fee (e.g. 5%)
      
      // Let's assume a fixed fee for now if we can't reliably read the balance here.
      // Wait, we can fetch the token balance of the contract ID using Horizon!
      const horizonUrl = process.env.NEXT_PUBLIC_STELLAR_NETWORK === "PUBLIC"
        ? "https://horizon.stellar.org"
        : "https://horizon-testnet.stellar.org";
        
      const res = await fetch(`${horizonUrl}/accounts/${contractId}`);
      if (!res.ok) {
        throw new Error("Could not fetch contract balance. Are there any funds?");
      }
      const data = await res.json();
      const nativeBalanceStr = data.balances?.find((b: any) => b.asset_type === "native")?.balance;
      const contractBalance = parseFloat(nativeBalanceStr || "0");

      if (contractBalance <= 0) {
        throw new Error("No funds available to withdraw.");
      }

      const adminWallet = process.env.NEXT_PUBLIC_ADMIN_WALLET_ID;
      if (!adminWallet) throw new Error("Admin wallet not configured.");

      // Calculate 5% platform fee
      const feeAmount = contractBalance * 0.05;
      const feeString = feeAmount.toFixed(7);

      // Build the transaction
      // Operation 1: withdraw from contract
      // Operation 2: pay fee to admin
      const tx = new TransactionBuilder(creatorAccount, {
        fee: "10000",
        networkPassphrase,
      })
        .addOperation(contract.call("withdraw"))
        .addOperation(
          Operation.payment({
            destination: adminWallet,
            asset: Asset.native(),
            amount: feeString,
          })
        )
        .setTimeout(300)
        .build();

      const sim = await server.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(sim)) {
         throw new Error("Simulation failed. Make sure the deadline has passed and the goal is met! " + (typeof sim.error === "string" ? sim.error : ""));
      }

      const prepared = rpc.assembleTransaction(tx, sim).build();

      const signedXdr = await signTransaction(prepared.toXDR(), { networkPassphrase });
      
      if (signedXdr.error) {
        throw new Error(signedXdr.error);
      }

      const signedTx = new Transaction(signedXdr.signedTxXdr, networkPassphrase);

      const send = await server.sendTransaction(signedTx);
      if (send.status !== "PENDING" && send.status !== "DUPLICATE") {
         throw new Error("Failed to send: " + send.status);
      }

      // Wait for confirmation using SDK server.getTransaction() — no raw fetch
      const hash = send.hash;
      await waitForSorobanTx(server, hash);

      setTxHash(hash);
      alert(`Withdrawal successful! A 5% platform fee (${feeString} XLM) was deducted.`);
    } catch (err: any) {
      console.error(err);
      alert("Withdrawal failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
      <h2 className="text-xl font-bold text-emerald-800">Withdraw Funds</h2>
      <p className="mt-2 text-sm text-emerald-700/90">
        If your campaign has successfully met its goal and the deadline has passed, you can withdraw your funds here.
        A small platform maintenance fee (5%) will be automatically sent to the admin wallet.
      </p>

      {!isPastDeadline && (
        <p className="mt-3 text-xs font-semibold text-amber-700">
          Note: Your campaign deadline has not passed yet. The smart contract will reject withdrawals.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          onClick={handleWithdraw}
          disabled={isSubmitting}
          className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSubmitting ? "Processing..." : "Withdraw Funds"}
        </button>
        {txHash && (
          <div className="flex items-center gap-2 rounded-xl bg-white/60 px-4 py-2">
            <span className="text-xs font-semibold text-emerald-800">Success!</span>
            <VerifyOnChain value={txHash} label="Verify Withdrawal ↗" />
          </div>
        )}
      </div>
    </div>
  );
}
