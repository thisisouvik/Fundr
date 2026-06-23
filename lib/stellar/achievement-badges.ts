import { Contract, TransactionBuilder, rpc, scValToNative } from "@stellar/stellar-sdk";
import { getNetworkPassphrase, getRpcServer } from "@/lib/stellar/soroban";

const STROOPS_PER_XLM = 10_000_000;

export interface CampaignAchievementSnapshot {
  firstBacker: string | null;
  firstBackerAmountXlm: number;
  topSupporter: string | null;
  topSupporterAmountXlm: number;
  totalPledgedXlm: number;
  verifiedCreator: boolean;
}

export async function getCampaignAchievementSnapshot(
  contractId: string,
  sourceWallet: string,
): Promise<CampaignAchievementSnapshot | null> {
  if (!contractId || !sourceWallet) {
    return null;
  }

  try {
    const server = getRpcServer();
    const networkPassphrase = getNetworkPassphrase();
    const sourceAccount = await server.getAccount(sourceWallet);
    const contract = new Contract(contractId);

    const tx = new TransactionBuilder(sourceAccount, {
      fee: "10000",
      networkPassphrase,
    })
      .addOperation(contract.call("get_achievement_snapshot"))
      .setTimeout(60)
      .build();

    const simulation = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simulation) || !simulation.result?.retval) {
      return null;
    }

    const [firstBacker, firstBackerAmount, topSupporter, topSupporterAmount, totalPledged, verifiedCreator] =
      scValToNative(simulation.result.retval) as [
        string | null,
        number | bigint,
        string | null,
        number | bigint,
        number | bigint,
        boolean,
      ];

    return {
      firstBacker: firstBacker ? String(firstBacker) : null,
      firstBackerAmountXlm: Number(firstBackerAmount) / STROOPS_PER_XLM,
      topSupporter: topSupporter ? String(topSupporter) : null,
      topSupporterAmountXlm: Number(topSupporterAmount) / STROOPS_PER_XLM,
      totalPledgedXlm: Number(totalPledged) / STROOPS_PER_XLM,
      verifiedCreator: Boolean(verifiedCreator),
    };
  } catch {
    return null;
  }
}