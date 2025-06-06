import RoundAnalyticsModel from "../../models/roundAnalytics.model";
import { GameError } from "../../utils/errors/gameError";
import { roundStateManager } from "./roundStateManager";

class RoundAnalyticsManager {
  async saveRoundAnalytics() {
    try {
      const roundState = roundStateManager.getState();

      const newRoundAnalytics = new RoundAnalyticsModel({
        roundId: roundState.roundId,
        totalPlayers: roundState.bets.size,
        roundPhase: roundState.gamePhase,
        provablyFairOutcome: roundState.provablyFairOutcome,
        financial: {
          houseProfit: 0,
          totalBetAmount: roundState.totalBetAmount,
          totalCashoutAmount: 0,
        },
      });

      console.log("Game analytics saved successfully");

      newRoundAnalytics.save();
    } catch (err) {
      console.log("Failed to save game analytics", err);

      throw new GameError({
        httpCode: 500,
        isOperational: false,
        internalMessage: "Failed to save round Analytics",
        description: "An error occured on our end. We are working on it",
      });
    }
  }
}

export default RoundAnalyticsManager;
