export interface BettingPayload {
  stake: number;
  autoCashoutMultiplier: number | null;
  userId: string;
  clientSeed: string;
  username: string;
}
