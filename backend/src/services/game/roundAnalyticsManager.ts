import RoundAnalyticsModel from "../../models/roundAnalytics.model";
import { RoundAnalyticsI } from "../../types/roundAnalytics.types";
import { GameError } from "../../utils/errors/gameError";

class RoundAnalyticsManager {
  async saveCompleteRoundResultsWithRetries(roundData: RoundAnalyticsI) {
    const maxRetries = 3;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const newRoundAnalytics = new RoundAnalyticsModel({
          roundId: roundData.roundId,
          totalPlayers: roundData.totalPlayers,
          roundPhase: roundData.roundPhase,
          provablyFairOutcome: roundData.provablyFairOutcome,
          financial: {
            houseProfit: 0,
            totalBetAmount: roundData.financial.totalCashoutAmount,
            totalCashoutAmount: 0,
          },
        });

        await newRoundAnalytics.save();
        return; // Success - exit
      } catch (err) {
        console.error(
          `Failed to save game analytics (attempt ${
            retries + 1
          }/${maxRetries})`,
          err
        );

        retries++;

        // Exponential backoff: 1s, 2s, 4s
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, retries - 1))
        );
      }
    }

    // Only throw if all retries have been exhausted
    throw new GameError({
      httpCode: 500,
      isOperational: false,
      internalMessage: "Failed to save round Analytics after all retries",
      description: "An error occurred on our end. We are working on it",
    });
  }
}

export default RoundAnalyticsManager;
