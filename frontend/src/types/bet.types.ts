export interface BettingPayload {
  stake: number;
  autoCashoutMultiplier: number | null;
  userId: string;
  clientSeed: string;
  username: string;
  storeId: string; // used to identify events
}

export interface SuccessfulBetRes {
  betId: string;
  accountBalance: number;
}
