import {
  Address,
  Contract,
  Keypair,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
} from "@stellar/stellar-sdk";

/**
 * Input for registering a campaign on-chain via the CrowdfundFactory contract.
 *
 * @field creatorWallet - The Stellar **public key** (G…) of the campaign creator.
 *   This is NOT the Supabase user.id UUID – it must be the wallet address stored
 *   in `profiles.wallet_address`.
 */
export interface CreateOnChainCampaignInput {
  /** Stellar G-address of the creator – must match the signing keypair for auth. */
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

function getNetworkPassphrase(network: string) {
  return network === "PUBLIC" ? Networks.PUBLIC : Networks.TESTNET;
}

async function waitForTransaction(
  server: SorobanRpc.Server,
  txHash: string,
  maxTries = 30,
) {
  for (let attempt = 0; attempt < maxTries; attempt += 1) {
    const tx = await server.getTransaction(txHash);
    if (tx.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      return tx;
    }

    if (
      tx.status === SorobanRpc.Api.GetTransactionStatus.FAILED ||
      tx.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND
    ) {
      throw new Error(`Soroban transaction failed with status: ${tx.status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(
    `Soroban transaction confirmation timed out after ${maxTries} attempts (hash: ${txHash})`,
  );
}

async function invokeFactoryCreate(input: CreateOnChainCampaignInput): Promise<OnChainCampaignResult> {
  const rpcUrl = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL;
  const factoryContractId = process.env.NEXT_PUBLIC_FACTORY_CONTRACT_ID;
  const factorySecret = process.env.STELLAR_FACTORY_SECRET_KEY;
  const network = (process.env.NEXT_PUBLIC_STELLAR_NETWORK || "TESTNET").toUpperCase();

  if (!rpcUrl || !factoryContractId || !factorySecret) {
    throw new Error(
      "Missing Soroban deployment env vars. " +
        "Expected: NEXT_PUBLIC_SOROBAN_RPC_URL, NEXT_PUBLIC_FACTORY_CONTRACT_ID, STELLAR_FACTORY_SECRET_KEY",
    );
  }

  if (!input.creatorWallet.startsWith("G") || input.creatorWallet.length !== 56) {
    throw new Error(
      `creatorWallet must be a valid Stellar public key (G…56 chars), got: "${input.creatorWallet}"`,
    );
  }

  const server = new SorobanRpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });
  const sourceKeypair = Keypair.fromSecret(factorySecret);
  const sourceAccount = await server.getAccount(sourceKeypair.publicKey());

  const contract = new Contract(factoryContractId);
  // Contract stores goal in stroops (1 XLM = 10_000_000 stroops) as i128
  const goalStroops = BigInt(Math.round(input.goalXlm * 10_000_000));
  const deadlineTs = Math.floor(new Date(input.deadlineIso).getTime() / 1000);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: "10000",
    networkPassphrase: getNetworkPassphrase(network),
  })
    .addOperation(
      contract.call(
        "create_campaign",
        // creator: Address – must be the Stellar wallet address, NOT a Supabase UUID
        new Address(input.creatorWallet).toScVal(),
        // goal_xlm: i128 (stroops)
        nativeToScVal(goalStroops, { type: "i128" }),
        // deadline_ts: u64 (unix seconds)
        nativeToScVal(deadlineTs, { type: "u64" }),
      ),
    )
    .setTimeout(120)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(sim)) {
    const detail =
      typeof sim.error === "string" ? sim.error : JSON.stringify(sim.error ?? "unknown");
    throw new Error(`Soroban simulation failed: ${detail}`);
  }

  const prepared = SorobanRpc.assembleTransaction(tx, sim).build();
  prepared.sign(sourceKeypair);

  const send = await server.sendTransaction(prepared);
  if (
    send.status !== SorobanRpc.Api.SendTransactionStatus.PENDING &&
    send.status !== SorobanRpc.Api.SendTransactionStatus.DUPLICATE
  ) {
    throw new Error(
      `Soroban sendTransaction failed with status "${send.status}": ${JSON.stringify(send.errorResult ?? send)}`,
    );
  }

  const txHash = send.hash;
  const finalTx = await waitForTransaction(server, txHash);

  if (!finalTx.returnValue) {
    throw new Error(
      `Soroban transaction succeeded but returned no value (hash: ${txHash})`,
    );
  }

  // The factory contract returns the new campaign's u64 sequence ID
  const campaignIdNative = scValToNative(finalTx.returnValue);
  const campaignId = String(campaignIdNative);

  return {
    // Composite address encodes which factory + which campaign slot
    contractAddress: `${factoryContractId}:${campaignId}`,
    factoryTxHash: txHash,
    campaignId,
    mode: "live",
  };
}

/**
 * Invoke the CrowdfundFactory contract's `create_campaign` entry-point and
 * return the campaign ID + transaction hash.
 *
 * Must be called **server-side only** – it requires `STELLAR_FACTORY_SECRET_KEY`.
 */
export async function createCampaignOnChain(
  input: CreateOnChainCampaignInput,
): Promise<OnChainCampaignResult> {
  return invokeFactoryCreate(input);
}
