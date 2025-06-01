export interface SingleBet {
  roundId: string;
  userId: string;
  betId: string;
  stake: number;
  payout: number | null;
  cashoutMultiplier: number | null;
  autoCashoutMultiplier: number | null;
  status: BetStatus;
}

export enum BetStatus {
  WON = "won",
  LOST = "lost",
  PENDING = "pending",
}
