import RoundAnalyticsModel from "../../models/roundAnalytics.model";
import { GameError } from "../../utils/errors/gameError";
import { roundStateManager } from "./roundStateManager";

class RoundAnalyticsManager {
  async saveRoundAnalyticsWithRetries() {
    const maxRetires = 3;
    let retires = 0;

    while (retires < maxRetires) {
      try {
        const roundState = roundStateManager.getState();

        const newRoundAnalytics = new RoundAnalyticsModel({
          roundId: roundState.roundId,
          totalPlayers: roundState.betsMap.size,
          roundPhase: roundState.gamePhase,
          provablyFairOutcome: roundState.provablyFairOutcome,
          financial: {
            houseProfit: 0,
            totalBetAmount: roundState.totalBetAmount,
            totalCashoutAmount: 0,
          },
        });

        await newRoundAnalytics.save();
        break;
      } catch (err) {
        console.error("Failed to save game analytics", err);

        retires++;

        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, retires - 1))
        );
      }
    }

    // At this point all retries have been exhausted
    throw new GameError({
      httpCode: 500,
      isOperational: false,
      internalMessage: "Failed to save round Analytics",
      description: "An error occured on our end. We are working on it",
    });
  }
}

export default RoundAnalyticsManager;
