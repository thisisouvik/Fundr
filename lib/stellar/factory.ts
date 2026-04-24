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
  Networks,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  rpc,
} from "@stellar/stellar-sdk";

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

function getNetworkPassphrase(network: string): string {
  return network === "PUBLIC" ? Networks.PUBLIC : Networks.TESTNET;
}

async function waitForTransaction(
  server: rpc.Server,
  txHash: string,
  maxTries = 30,
): Promise<rpc.Api.GetTransactionResponse> {
  for (let attempt = 0; attempt < maxTries; attempt += 1) {
    const tx = await server.getTransaction(txHash);

    if (tx.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return tx;
    }

    if (
      tx.status === rpc.Api.GetTransactionStatus.FAILED ||
      tx.status === rpc.Api.GetTransactionStatus.NOT_FOUND
    ) {
      throw new Error(
        `Soroban transaction failed with status: ${tx.status} (hash: ${txHash})`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(
    `Soroban transaction confirmation timed out after ${maxTries} attempts (hash: ${txHash})`,
  );
}

async function invokeFactoryCreate(
  input: CreateOnChainCampaignInput,
): Promise<OnChainCampaignResult> {
  const rpcUrl = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL;
  const factoryContractId = process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ID;
  const factorySecret = process.env.STELLAR_FACTORY_SECRET_KEY;
  const network = (process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? "TESTNET").toUpperCase();

  if (!rpcUrl || !factoryContractId || !factorySecret) {
    throw new Error(
      "Missing Soroban env vars. Required: " +
        "NEXT_PUBLIC_SOROBAN_RPC_URL, NEXT_PUBLIC_FACTORY_CONTRACT_ID, STELLAR_FACTORY_SECRET_KEY",
    );
  }

  if (!input.creatorWallet.startsWith("G") || input.creatorWallet.length !== 56) {
    throw new Error(
      `creatorWallet must be a valid Stellar public key (G... 56 chars), ` +
        `got: "${input.creatorWallet}"`,
    );
  }

  // rpc.Server is the v13 equivalent of SorobanRpc.Server
  const server = new rpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });
  const sourceKeypair = Keypair.fromSecret(factorySecret);
  const sourceAccount = await server.getAccount(sourceKeypair.publicKey());

  const contract = new Contract(factoryContractId);

  // Contract expects goal in stroops (1 XLM = 10_000_000 stroops) as i128
  const goalStroops = BigInt(Math.round(input.goalXlm * 10_000_000));
  // Contract expects deadline as unix timestamp (seconds) as u64
  const deadlineTs = Math.floor(new Date(input.deadlineIso).getTime() / 1000);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: "10000",
    networkPassphrase: getNetworkPassphrase(network),
  })
    .addOperation(
      contract.call(
        "create_campaign",
        // creator: Address
        new Address(input.creatorWallet).toScVal(),
        // token_address: Address (XLM Native Token)
        new Address(process.env.NEXT_PUBLIC_STELLAR_TOKEN_ADDRESS || "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC").toScVal(),
        // goal_xlm: i128 (in stroops)
        nativeToScVal(goalStroops, { type: "i128" }),
        // deadline_ts: u64 (unix seconds)
        nativeToScVal(deadlineTs, { type: "u64" }),
      ),
    )
    .setTimeout(120)
    .build();

  // Simulate first to get resource footprint
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    const detail =
      typeof sim.error === "string" ? sim.error : JSON.stringify(sim.error ?? "unknown");
    throw new Error(`Soroban simulation failed: ${detail}`);
  }

  // Assemble (adds resource fees from simulation) then sign
  const prepared = rpc.assembleTransaction(tx, sim).build();
  prepared.sign(sourceKeypair);

  // Submit the signed transaction
  const send = await server.sendTransaction(prepared);

  // In SDK v13 the status is a plain string: "PENDING" | "DUPLICATE" | "TRY_AGAIN_LATER" | "ERROR"
  if (send.status !== "PENDING" && send.status !== "DUPLICATE") {
    throw new Error(
      `Soroban sendTransaction failed with status "${send.status}": ` +
        JSON.stringify((send as unknown as Record<string, unknown>).errorResult ?? send),
    );
  }

  const txHash = send.hash;
  const finalTx = await waitForTransaction(server, txHash);

  if (finalTx.status !== rpc.Api.GetTransactionStatus.SUCCESS || !finalTx.returnValue) {
    throw new Error(
      `Soroban transaction succeeded but returned no value (hash: ${txHash})`,
    );
  }

  // The factory contract returns the new campaign's Address
  const campaignAddressNative = scValToNative(finalTx.returnValue);
  const contractAddress = String(campaignAddressNative);

  return {
    contractAddress,
    factoryTxHash: txHash,
    campaignId: contractAddress,
    mode: "live",
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
