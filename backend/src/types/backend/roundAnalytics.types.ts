import { GamePhase, ProvablyFairOutcomeI } from "../shared/socketIo/gameTypes";

export interface RoundAnalyticsI {
  roundId: string;
  totalPlayers: number;
  roundPhase: GamePhase;
  provablyFairOutcome: ProvablyFairOutcomeI;
  financial: FinancialsData;
  roundCount: number;
}

export interface FinancialsData {
  totalBetAmount: number;
  totalCashoutAmount: number;
  houseProfit: number;
}
