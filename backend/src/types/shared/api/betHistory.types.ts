export interface GetBetHistoryParams {
  userId: string;
  page: number;
}

export interface GetBetHistoryRes {
  betId: string;
  stake: number;
  payout: number;
  cashoutMultiplier: number;
  finalMultiplier: number | null;
  autoCashoutMultiplier: number | null;
  createdAt: string | Date;
}
