export interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  balanceXlm: number | null;
  network: "TESTNET" | "MAINNET" | null;
  isLoading: boolean;
  error: string | null;
}

export type WalletError =
  | "WALLET_NOT_INSTALLED"
  | "WALLET_NOT_CONNECTED"
  | "WRONG_NETWORK"
  | "INSUFFICIENT_BALANCE"
  | "USER_REJECTED"
  | "CAMPAIGN_EXPIRED"
  | "GOAL_ALREADY_MET"
  | "TRANSACTION_FAILED";
