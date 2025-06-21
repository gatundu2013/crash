import { GamePhase, ProvablyFairOutcomeI } from "./game.types";

export interface RoundAnalyticsI {
  roundId: string;
  totalPlayers: number;
  roundPhase: GamePhase;
  provablyFairOutcome: ProvablyFairOutcomeI;
  financial: FinancialsData;
}

export interface FinancialsData {
  totalBetAmount: number;
  totalCashoutAmount: number;
  houseProfit: number;
}
