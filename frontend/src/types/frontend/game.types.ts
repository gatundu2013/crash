import type { TopStakers } from "../shared/socketIo/betTypes";
import type {
  BettingPhaseRes,
  EndPhaseRes,
  GamePhase,
  GamePhaseErrorRes,
  OnConnectRes,
  PreparingPhaseRes,
  PreviousMultiplier,
  RunningPhaseRes,
  BroadcastCashoutSuccessRes,
  BroadcastPlaceBetSuccessRes,
} from "../shared/socketIo/gameTypes";

export interface GameStoreI {
  gamePhase: GamePhase;
  hashedServerSeed: string;
  currentMultiplier: number;
  finalMultiplier: number;
  message: string;
  previousMultipliers: PreviousMultiplier[];
  topStakers: TopStakers[];
  countDown: number;
  totalBets: number;
  cashedOutBetsSize: number;
  totalBetAmount: number;
  numberOfCashouts: number;

  // phase handlers
  handlePreparingPhase: (data: PreparingPhaseRes) => void;
  handleRunningPhase: (data: RunningPhaseRes) => void;
  handleEndPhase: (data: EndPhaseRes) => void;
  handleBettingPhase: (data: BettingPhaseRes) => void;
  handleErrorPhase: (data: GamePhaseErrorRes) => void;

  handleBroadcastSuccessfulBets: (data: BroadcastPlaceBetSuccessRes) => void;
  handleBroadcastSuccessfulCashouts: (data: BroadcastCashoutSuccessRes) => void;
  onConnectData: (data: OnConnectRes) => void;
  resetLiveStats: () => void;
}
