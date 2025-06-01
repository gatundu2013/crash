export interface SingleBet {
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

export interface BettingPayload {
  stake: number;
  autoCashoutMultiplier: number | null;
  userId: string;
  clientSeed: string;
}
