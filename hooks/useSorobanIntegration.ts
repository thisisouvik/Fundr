"use client";

import { useCallback, useState } from "react";
import { isConnected, isAllowed, getAddress, signTransaction } from "@stellar/freighter-api";
import { rpc, TransactionBuilder, Transaction, xdr } from "@stellar/stellar-sdk";
import { getRpcServer, getNetworkPassphrase, waitForSorobanTx } from "@/lib/stellar/soroban";

interface SubmitTransactionArgs {
  buildOperations: (walletAddress: string) => xdr.Operation[] | Promise<xdr.Operation[]>;
  fee?: string;
  timeout?: number;
}

export function useSorobanIntegration() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitTransaction = useCallback(async ({
    buildOperations,
    fee = "10000",
    timeout = 300,
  }: SubmitTransactionArgs) => {
    setIsSubmitting(true);
    try {
      if (!(await isConnected())) {
        throw new Error("Freighter is not installed.");
      }
      if (!(await isAllowed())) {
        throw new Error("Please authorize Fundr in Freighter.");
      }
      const walletAddressObj = await getAddress();
      if (!walletAddressObj || !walletAddressObj.address) {
        throw new Error("Could not get wallet address.");
      }
      const walletAddress = walletAddressObj.address;

      const server = getRpcServer();
      const networkPassphrase = getNetworkPassphrase();

      const account = await server.getAccount(walletAddress);

      let txBuilder = new TransactionBuilder(account, {
        fee,
        networkPassphrase,
      });

      const operations = await buildOperations(walletAddress);
      for (const op of operations) {
        txBuilder = txBuilder.addOperation(op);
      }
      
      const tx = txBuilder.setTimeout(timeout).build();

      const sim = await server.simulateTransaction(tx);
      if (rpc.Api.isSimulationError(sim)) {
        throw new Error("Simulation failed. " + (typeof sim.error === "string" ? sim.error : ""));
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

      const hash = send.hash;
      await waitForSorobanTx(server, hash);

      return { hash, walletAddress };
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { submitTransaction, isSubmitting };
}
