import mongoose, { AnyBulkWriteOperation } from "mongoose";
import { Socket } from "socket.io";
import { BetHistoryI } from "../models/betHistory.model";

// ==============================
//         ENUMS
// ==============================

export enum BetStatus {
  WON = "won",
  LOST = "lost",
  PENDING = "pending",
}

// ==============================
//        COMMON TYPES
// ==============================

export interface UserAccountBalance {
  userId: string;
  accountBalance: number;
}

// ==============================
//        BETTING SECTION
// ==============================

export interface BettingPayload {
  stake: number;
  autoCashoutMultiplier: number | null;
  userId: string;
  clientSeed: string;
  username: string;
  storeId: string; // Identifies which button/store triggered the bet
}

export interface StageBetParams {
  payload: BettingPayload;
  socket: Socket;
}

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

export interface ValidateBetsParams {
  groupedUserBets: Map<string, GroupedUserBets>;
  userAccountBalances: UserAccountBalance[];
}

export interface ExecuteDatabaseOperationsParams {
  balanceUpdateOps: AnyBulkWriteOperation[];
  validatedBets: AcceptedBet[];
  session: mongoose.ClientSession;
}

export interface FailedBetInfo {
  socket: Socket;
  storeId: string;
  reason: string;
}

export interface BatchLogsParams {
  batchStart: number;
  batchSize: number;
  successfulBetsCounts: number;
  failedBetsCounts: number;
}

// ==============================
//        IN-MEMORY BET STATE
// ==============================

export interface SingleBet {
  userId: string;
  betId: string;
  stake: number;
  payout: number | null;
  cashoutMultiplier: number | null;
  autoCashoutMultiplier: number | null;
  status: BetStatus;
}

export interface BetInMemory {
  bet: SingleBet;
  socket: Socket;
}

export interface TopStaker
  extends Omit<SingleBet, "userId" | "status" | "autoCashoutMultiplier"> {
  username: string;
}

export interface BetWithAutoCashout {
  autoCashoutMultiplier: number;
  isProcessed: boolean;
}

// ==============================
//        CASHOUT SECTION
// ==============================

export interface CashoutPayload {
  betId: string;
}

export interface StageCashoutParams {
  payload: CashoutPayload;
  socket: Socket;
  isFromAutoCashout: boolean;
  autoCashoutMultiplier: number | null;
}

export interface StagedCashout extends CashoutPayload {
  userId: string;
  cashoutMultiplier: number;
  stake: number;
  socket: Socket;
  payout: number;
}

export interface GroupedUserCashouts {
  cashouts: StagedCashout[];
  totalPayout: number;
}

export interface PrepareCashoutOperationsParams {
  groupedUserCashouts: Map<string, GroupedUserCashouts>;
  userAccountBalances: UserAccountBalance[];
}

export interface ExecuteCashoutOperationsParams {
  balanceUpdateOps: AnyBulkWriteOperation[];
  betHistoryUpdateOps: AnyBulkWriteOperation<BetHistoryI>[];
  session: mongoose.ClientSession;
}

export interface NotifyCashoutResultsParams {
  successfulCashouts: (StagedCashout & { newAccountBalance: number })[];
}

export interface NotifyFailedCashoutsParams {
  failedCashouts: StagedCashout[];
  reason: string;
}

// ==============================
//        CASHOUT MANAGER SECTION
// ==============================

export type AutoCashoutEntry = {
  autoCashoutMultiplier: number;
  isProcessed: boolean;
};

export interface AutoCashoutParams {
  currentMultiplier: number;
  activeBets: Map<string, BetInMemory>;
  betsWithAutoCashouts: Map<string, AutoCashoutEntry>;
}

export interface LogBatchTimingParams {
  batchStart: number;
  batchSize: number;
  successCount: number;
  failureCount: number;
}
