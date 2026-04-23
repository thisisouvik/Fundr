export class WalletNotConnectedError extends Error {
  code = "WALLET_NOT_CONNECTED";

  constructor() {
    super("Please connect your Freighter wallet to continue.");
  }
}

export class InsufficientBalanceError extends Error {
  code = "INSUFFICIENT_BALANCE";

  constructor(required: number, available: number) {
    super(
      `Insufficient balance. Required: ${required} XLM, Available: ${available} XLM`,
    );
  }
}

export class CampaignExpiredError extends Error {
  code = "CAMPAIGN_EXPIRED";

  constructor() {
    super("This campaign has already ended.");
  }
}

export class WrongNetworkError extends Error {
  code = "WRONG_NETWORK";

  constructor() {
    super("Please switch Freighter to Stellar Testnet.");
  }
}

export class TransactionFailedError extends Error {
  code = "TRANSACTION_FAILED";

  constructor(message: string) {
    super(`Transaction failed: ${message}`);
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}
