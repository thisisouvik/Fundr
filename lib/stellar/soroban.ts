/**
 * lib/stellar/soroban.ts
 *
 * Shared helpers for Soroban smart contract interactions.
 * Uses @stellar/stellar-sdk rpc.Server API (v13.x) — no raw fetch for polling.
 */

import { rpc, Networks } from "@stellar/stellar-sdk";

export function getRpcServer(): rpc.Server {
  const rpcUrl =
    process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ||
    "https://soroban-testnet.stellar.org";
  return new rpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });
}

export function getNetworkPassphrase(): string {
  return process.env.NEXT_PUBLIC_STELLAR_NETWORK === "PUBLIC"
    ? Networks.PUBLIC
    : Networks.TESTNET;
}

/**
 * Poll the RPC node using the SDK until the transaction is confirmed.
 * Uses server.getTransaction() — the proper SDK API instead of raw fetch.
 */
export async function waitForSorobanTx(
  server: rpc.Server,
  txHash: string,
  maxTries = 30,
): Promise<rpc.Api.GetTransactionResponse> {
  for (let attempt = 0; attempt < maxTries; attempt++) {
    let result: rpc.Api.GetTransactionResponse;
    try {
      result = await server.getTransaction(txHash);
    } catch (e: any) {
      // "Bad union switch: N" is thrown by the SDK when the transaction
      // failed on-chain and the failure XDR contains a type the SDK version
      // can't decode. Treat it as an on-chain failure.
      if (e?.message?.includes("Bad union switch")) {
        throw new Error(
          `Transaction failed on-chain (the Soroban runtime rejected it). ` +
          `Inspect on Stellar Expert: https://stellar.expert/explorer/testnet/tx/${txHash}`
        );
      }
      throw e;
    }

    if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return result;
    }

    if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(
        `Transaction failed on-chain (hash: ${txHash}). ` +
        `Inspect: https://stellar.expert/explorer/testnet/tx/${txHash}`
      );
    }

    // NOT_FOUND → still processing, wait and retry
    await new Promise((r) => setTimeout(r, 1000));
  }

  throw new Error(
    `Transaction confirmation timed out after ${maxTries}s (hash: ${txHash})`,
  );
}

