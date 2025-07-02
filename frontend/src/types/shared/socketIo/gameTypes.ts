import type { TopStakers } from "./betTypes";

/**
 * ...... GLOBALS ......
 */
export interface ClientSeedDetails {
  seed: string | null;
  username: string;
}

export interface PreviousMultiplier {
  finalMultiplier: number;
  roundId: string;
}

export enum GamePhase {
  PREPARING = "preparing",
  RUNNING = "running",
  END = "end",
  BETTING = "betting",
  ERROR = "error",
}

export interface ProvablyFairOutcomeI {
  clientSeedDetails: ClientSeedDetails[] | [];
  clientSeed: string | null;
  serverSeed: string | null;
  hashedServerSeed: string | null;
  gameHash: string | null;
  rawMultiplier: number | null;
  decimal: number | null;
  finalMultiplier: number | null;
}

/**
 * ......  RESPONSES ......
 */
export interface BettingPhaseRes {
  gamePhase: GamePhase.BETTING;
  countDown: number;
}

export interface PreparingPhaseRes {
  gamePhase: GamePhase.PREPARING;
  hashedServerSeed: string;
}

export interface RunningPhaseRes {
  gamePhase: GamePhase.RUNNING;
  currentMultiplier: number;
}

export interface EndPhaseRes {
  gamePhase: GamePhase.END;
  finalMultiplier: number;
  roundId: string;
}

export interface GamePhaseErrorRes {
  gamePhase: GamePhase.ERROR;
  message: string;
}

export interface OnConnectRes {
  topStakers: TopStakers[];
  previousMultipliers: PreviousMultiplier[];
  hashedServerSeed: string;
}

export interface BroadcastCashoutSuccessRes {
  topStakers?: TopStakers[];
  numberOfCashouts: number;
}

export interface BroadcastPlaceBetSuccessRes {
  totalBetAmount: number;
  topStakers: TopStakers[];
  totalBets: number;
}
