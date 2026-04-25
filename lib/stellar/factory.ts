/**
 * lib/stellar/factory.ts
 *
 * Server-side only. Requires STELLAR_FACTORY_SECRET_KEY (never sent to the browser).
 * Compatible with @stellar/stellar-sdk v13.x (rpc namespace, not SorobanRpc).
 */

import {
  Address,
  Contract,
  Keypair,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  rpc,
} from "@stellar/stellar-sdk";
import { getRpcServer, getNetworkPassphrase, waitForSorobanTx } from "@/lib/stellar/soroban";

/**
 * Input for registering a campaign on-chain via the CrowdfundFactory contract.
 *
 * @field creatorWallet - The Stellar public key (G...) of the campaign creator.
 *   This is NOT the Supabase user.id UUID. It must be the wallet address stored
 *   in profiles.wallet_address.
 */
export interface CreateOnChainCampaignInput {
  /** Stellar G-address of the creator. Must match the signing keypair for auth. */
  creatorWallet: string;
  goalXlm: number;
  deadlineIso: string;
  title: string;
}

export interface OnChainCampaignResult {
  contractAddress: string;
  factoryTxHash: string;
  /** The u64 sequence ID returned by the factory contract (stringified). */
  campaignId: string;
  mode: "live";
}



async function invokeFactoryCreate(
  input: CreateOnChainCampaignInput,
): Promise<OnChainCampaignResult> {
  const factoryContractId = process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ID;
  const factorySecret = process.env.STELLAR_FACTORY_SECRET_KEY;

  if (!factoryContractId || !factorySecret) {
    throw new Error(
      "Missing Soroban env vars. Required: " +
        "NEXT_PUBLIC_FACTORY_CONTRACT_ID, STELLAR_FACTORY_SECRET_KEY",
    );
  }

  if (!input.creatorWallet.startsWith("G") || input.creatorWallet.length !== 56) {
    throw new Error(
      `creatorWallet must be a valid Stellar public key (G... 56 chars), ` +
        `got: "${input.creatorWallet}"`,
    );
  }

  // Use shared helpers — Contract class-based pattern throughout
  const server = getRpcServer();
  const networkPassphrase = getNetworkPassphrase();
  const sourceKeypair = Keypair.fromSecret(factorySecret);
  const sourceAccount = await server.getAccount(sourceKeypair.publicKey());

  // Contract class-based call — standard Soroban integration pattern
  const contract = new Contract(factoryContractId);

  // goal in stroops (i128) — campaign/pledge() calls token.transfer() in stroops
  // deadline in unix seconds (u64)
  const goalStroops = BigInt(Math.round(input.goalXlm * 10_000_000));
  const deadlineTs  = Math.floor(new Date(input.deadlineIso).getTime() / 1000);

  console.log("[factory] create_campaign args:", {
    creator:    input.creatorWallet,
    goal:       goalStroops.toString(),
    deadlineTs,
    now:        Math.floor(Date.now() / 1000),
    deltaS:     deadlineTs - Math.floor(Date.now() / 1000),
  });

  const buildTx = (acct: typeof sourceAccount) =>
    new TransactionBuilder(acct, { fee: "100000", networkPassphrase })
      .addOperation(
        contract.call(
          "create_campaign",
          new Address(input.creatorWallet).toScVal(),
          new Address(
            process.env.NEXT_PUBLIC_STELLAR_TOKEN_ADDRESS ||
              "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
          ).toScVal(),
          nativeToScVal(goalStroops, { type: "i128" }),
          nativeToScVal(deadlineTs,  { type: "u64"  }),
        ),
      )
      .setTimeout(300)
      .build();

  let tx = buildTx(sourceAccount);

  // ── Simulate (first pass) ─────────────────────────────────────────────────
  let sim = await server.simulateTransaction(tx);
  console.log("[factory] simulation type — isError:", rpc.Api.isSimulationError(sim),
    "| isSuccess:", rpc.Api.isSimulationSuccess(sim),
    "| isRestore:", rpc.Api.isSimulationRestore(sim));

  // ── Handle SimulationRestore ──────────────────────────────────────────────
  // deploy_v2() inside the factory may require expired ledger entries to be
  // restored before the call can succeed. If so, build + submit a restore tx
  // first, then re-simulate the original call.
  if (rpc.Api.isSimulationRestore(sim)) {
    console.log("[factory] Ledger restore required — submitting restore transaction…");
    const restoreSim = sim as rpc.Api.SimulateTransactionRestoreResponse;

    const restoreTx = rpc.assembleTransaction(tx, restoreSim).build();
    restoreTx.sign(sourceKeypair);

    const restoreSend = await server.sendTransaction(restoreTx);
    if (restoreSend.status !== "PENDING" && restoreSend.status !== "DUPLICATE") {
      throw new Error(
        `Restore transaction failed with status "${restoreSend.status}": ` +
        JSON.stringify((restoreSend as any).errorResult ?? restoreSend),
      );
    }
    await waitForSorobanTx(server, restoreSend.hash);
    console.log("[factory] Restore complete — re-fetching account and re-simulating…");

    // Re-fetch account (sequence number has advanced) then re-simulate
    const freshAccount = await server.getAccount(sourceKeypair.publicKey());
    tx  = buildTx(freshAccount);
    sim = await server.simulateTransaction(tx);
    console.log("[factory] Re-simulation — isError:", rpc.Api.isSimulationError(sim),
      "| isSuccess:", rpc.Api.isSimulationSuccess(sim));
  }

  // ── Check for simulation error ────────────────────────────────────────────
  if (rpc.Api.isSimulationError(sim)) {
    const detail = typeof sim.error === "string"
      ? sim.error
      : JSON.stringify(sim.error ?? "unknown");
    console.error("[factory] Simulation error detail:", detail);
    throw new Error(`Soroban simulation failed: ${detail}`);
  }

  // ── Read simulated return value safely ────────────────────────────────────
  // Check ScVal type via switch().name (stable string enum) BEFORE calling
  // scValToNative to avoid "Bad union switch: N" from js-xdr.
  let simulatedAddress = "";
  if (rpc.Api.isSimulationSuccess(sim) && sim.result?.retval) {
    const retval = sim.result.retval;
    try {
      const switchName: string = retval.switch().name;
      console.log("[factory] retval ScVal type:", switchName, "(value:", retval.switch().value, ")");

      if (switchName === "scvAddress") {
        simulatedAddress = String(scValToNative(retval));
        console.log("[factory] Simulated campaign address:", simulatedAddress);
      } else if (switchName === "scvError" || switchName === "scvI32" || switchName === "scvU32") {
        let errCode: unknown;
        try {
          errCode = switchName === "scvError"
            ? String(retval.error()?.code)
            : scValToNative(retval);
        } catch { errCode = "unknown"; }
        console.error("[factory] Contract returned error ScVal:", switchName, errCode);
        throw new Error(
          `Contract returned an error during simulation (${switchName}, code: ${errCode}). ` +
          `Check server logs for the ledger timestamp vs deadline timestamp.`
        );
      } else {
        console.warn("[factory] Unexpected retval ScVal type:", switchName, "— will read from confirmed tx.");
      }
    } catch (scErr: any) {
      if (scErr.message?.startsWith("Contract returned an error")) throw scErr;
      console.warn("[factory] retval parse failed:", scErr.message, "— will read address from confirmed tx.");
    }
  }

  // Assemble (injects resource fees + footprint from simulation) then sign
  const prepared = rpc.assembleTransaction(tx, sim).build();
  prepared.sign(sourceKeypair);

  const send = await server.sendTransaction(prepared);
  console.log("[factory] sendTransaction status:", send.status);

  if (send.status !== "PENDING" && send.status !== "DUPLICATE") {
    throw new Error(
      `Soroban sendTransaction failed with status "${send.status}": ` +
      JSON.stringify((send as any).errorResult ?? send),
    );
  }

  const txHash = send.hash;
  const confirmedTx = await waitForSorobanTx(server, txHash);
  console.log("[factory] Transaction confirmed:", txHash);

  // Read address from confirmed tx if simulation didn't give it
  if (!simulatedAddress || !simulatedAddress.startsWith("C")) {
    try {
      const txResult = confirmedTx as rpc.Api.GetSuccessfulTransactionResponse;
      const returnVal = txResult.returnValue;
      if (returnVal && returnVal.switch().name === "scvAddress") {
        const decoded = String(scValToNative(returnVal));
        if (decoded.startsWith("C")) simulatedAddress = decoded;
        console.log("[factory] Campaign address from confirmed tx:", simulatedAddress);
      }
    } catch (decodeErr) {
      console.warn("[factory] Could not decode address from confirmed tx:", decodeErr);
    }
  }

  if (!simulatedAddress) {
    console.warn("[factory] Could not determine campaign contract address; using factory as fallback.");
    simulatedAddress = factoryContractId;
  }

  return {
    contractAddress: simulatedAddress,
    factoryTxHash:   txHash,
    campaignId:      simulatedAddress,
    mode:            "live",
  };
}

/**
 * Invoke the CrowdfundFactory contract's create_campaign entry-point and
 * return the campaign ID + transaction hash.
 *
 * Must be called server-side only. Requires STELLAR_FACTORY_SECRET_KEY.
 */
export async function createCampaignOnChain(
  input: CreateOnChainCampaignInput,
): Promise<OnChainCampaignResult> {
  return invokeFactoryCreate(input);
}
