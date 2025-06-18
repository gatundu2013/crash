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
  storeId: string; // used for differentiating button(Prevents cross-talk in events)
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
  userId: string;
  accountBalance: number;
}
export interface FailedBetInfo {
  socket: Socket;
  storeId: string;
  reason: string;
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

// =============================
//      CASHOUT MANAGER
//==============================
export interface CashoutPayload {
  betId: string;
}
export interface StagedCashout extends CashoutPayload {
  userId: string;
  cashoutMultiplier: number;
  stake: number;
  socket: Socket;
  payout: number;
}

export interface StageCashoutParams {
  payload: CashoutPayload;
  socket: Socket;
}

export interface GroupedUserCashouts {
  cashouts: StagedCashout[];
  totalPayout: number;
}
