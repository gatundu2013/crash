import { GamePhase, ProvablyFairOutcomeI } from "./game.types";

export interface RoundAnalyticsI {
  roundId: string;
  totalPlayers: number;
  roundPhase: GamePhase;
  provablyFairOutcome: ProvablyFairOutcomeI;
  financial: {
    totalBetAmount: number;
    totalCashoutAmount: number;
    houseProfit: number;
  };
}
