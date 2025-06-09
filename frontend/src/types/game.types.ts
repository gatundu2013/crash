export enum GamePhase {
  IDLE = "idle",
  PREPARING = "preparing",
  RUNNING = "running",
  END = "end",
  BETTING = "betting",
  ERROR = "error",
}

export interface PreviousMultiplier {
  roundId: string;
  multiplier: number;
}

export interface TopStaker {
  betId: string;
  stake: number;
  payout: number | null;
  cashoutMultiplier: number | null;
}
export interface GameStoreI {
  gamePhase: GamePhase;
  hashedServerSeed: string;
  currentMultiplier: number;
  finalCrashPoint: number;
  message: string;
  previousMultipliers: PreviousMultiplier[];
  topStakers: TopStaker[];
  countDown: number;
  allBetsSize: number;
  cashedOutBetsSize: number;
  totalBetAmount: number;

  // phase handlers
  handlePreparingPhase: (hashedServerSeed: string) => void;
  handleRunningPhase: (currentMultiplier: number) => void;
  handleEndPhase: (finalCrashPoint: number) => void;
  handleBettingPhase: (countDown: number) => void;
  handleErrorPhase: (message: string) => void;
}

export type PreparingPhaseData = {
  hashedServerSeed: string;
};
export type RunningPhaseData = {
  currentMultiplier: number;
};
export type EndPhaseData = {
  finalCrashPoint: number;
};
export type BettingPhaseData = {
  countDown: number;
};
export type ErrorPhaseData = {
  message: string;
};
