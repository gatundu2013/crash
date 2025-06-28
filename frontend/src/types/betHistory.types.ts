export interface GetBetHistoryRes {
  betId: string;
  stake: number;
  payout: number;
  cashoutMultiplier: number;
  finalMultiplier: number | null;
  autoCashoutMultiplier: number | null;
  createdAt: string | Date;
}
