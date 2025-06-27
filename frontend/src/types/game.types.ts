export enum GamePhase {
  IDLE = "idle",
  PREPARING = "preparing",
  RUNNING = "running",
  END = "end",
  BETTING = "betting",
  ERROR = "error",
}

export interface PreviousMultiplier {
  finalMultiplier: number;
  roundId: string;
}

export interface TopStaker {
  betId: string;
  stake: number;
  payout: number | null;
  cashoutMultiplier: number | null;
  username: string;
}

export interface GameStoreI {
  gamePhase: GamePhase;
  hashedServerSeed: string;
  currentMultiplier: number;
  finalMultiplier: number;
  message: string;
  previousMultipliers: PreviousMultiplier[];
  topStakers: TopStaker[];
  countDown: number;
  totalBets: number;
  cashedOutBetsSize: number;
  totalBetAmount: number;
  numberOfCashouts: number;

  // phase handlers
  handlePreparingPhase: (data: PreparingPhaseData) => void;
  handleRunningPhase: (data: RunningPhaseData) => void;
  handleEndPhase: (data: EndPhaseData) => void;
  handleBettingPhase: (data: BettingPhaseData) => void;
  handleErrorPhase: (data: ErrorPhaseData) => void;

  handleBroadcastSuccessfulBets: (data: BroadcastBetRes) => void;
  handleBroadcastSuccessfulCashouts: (data: BroadcastCashoutRes) => void;
  handleBroadcastHashedServerSeed: (data: BroadcastHashedServerSeed) => void;
  onConnectData: (data: OnConnectData) => void;
}

export interface PreparingPhaseData {
  gamePhase: string;
}
export interface RunningPhaseData {
  currentMultiplier: number;
}
export interface EndPhaseData {
  finalMultiplier: number;
  roundId: string;
}
export interface BettingPhaseData {
  countDown: number;
}
export interface ErrorPhaseData {
  message: string;
}

export interface BroadcastHashedServerSeed {
  hashedServerSeed: string;
}

export interface BroadcastBetRes {
  totalBetAmount: number;
  totalBets: number;
  topStakers: TopStaker[];
}

export interface BroadcastCashoutRes {
  topStakers: TopStaker[];
  numberOfCashouts: number;
}

export interface OnConnectData {
  topStakers: TopStaker[];
  previousMultipliers: PreviousMultiplier[];
  hashedServerSeed: string;
}
