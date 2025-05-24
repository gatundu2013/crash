export interface SingleBet {
  roundId: string;
  userId: string;
  betId: string;
  stake: number;
  payout: number | null;
  cashoutMultiplier: number | null;
  autoCashoutValue: number | null;
}
