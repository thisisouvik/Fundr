import { Address, Contract, TransactionBuilder, rpc, scValToNative } from "@stellar/stellar-sdk";
import { getNetworkPassphrase, getRpcServer } from "@/lib/stellar/soroban";

export interface CreatorReputationView {
  rawScore: number;
  displayScore: number;
  trusted: boolean;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

export async function getCreatorReputation(
  contractId: string,
  creatorWallet: string,
): Promise<CreatorReputationView | null> {
  if (!contractId || !creatorWallet) {
    return null;
  }

  try {
    const server = getRpcServer();
    const networkPassphrase = getNetworkPassphrase();
    const sourceAccount = await server.getAccount(creatorWallet);
    const contract = new Contract(contractId);

    const tx = new TransactionBuilder(sourceAccount, {
      fee: "10000",
      networkPassphrase,
    })
      .addOperation(
        contract.call("get_creator_reputation", new Address(creatorWallet).toScVal()),
      )
      .setTimeout(60)
      .build();

    const simulation = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simulation) || !simulation.result?.retval) {
      return null;
    }

    const rawScore = Number(scValToNative(simulation.result.retval));
    const displayScore = clampScore(rawScore);

    return {
      rawScore,
      displayScore,
      trusted: displayScore >= 80,
    };
  } catch {
    return null;
  }
}