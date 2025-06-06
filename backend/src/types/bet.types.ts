import mongoose from "mongoose";
import { Socket } from "socket.io";

export enum BetStatus {
  WON = "won",
  LOST = "lost",
  PENDING = "pending",
}

export interface SingleBet {
  userId: string;
  betId: string;
  stake: number;
  payout: number | null;
  cashoutMultiplier: number | null;
  autoCashoutMultiplier: number | null;
  status: BetStatus;
}

export interface BettingPayload {
  stake: number;
  autoCashoutMultiplier: number | null;
  userId: string;
  clientSeed: string;
  username: string;
}

// ==================================
//      BETTING MANAGER
// ==================================
export interface StagedBet {
  payload: BettingPayload & { betId: string };
  socket: Socket;
}
export interface AcceptedBet extends StagedBet {
  newAccountBalance: number;
}
export interface GroupedUserBets {
  totalStake: number;
  bets: StagedBet[];
}
export interface userAccountBalance {
  _id: mongoose.Types.ObjectId;
  accountBalance: number;
}

// ==============================
//      ROUND_STATE MANAGER
//===============================
export interface BetInMemory {
  bet: SingleBet;
  socket: Socket;
}
export interface TopStaker
  extends Omit<SingleBet, "userId" | "status" | "autoCashoutMultiplier"> {
  username: string;
}
