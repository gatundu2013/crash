import mongoose from "mongoose";
import RoundAnalyticsModel from "../../models/roundAnalytics.model";
import { GamePhase } from "../../types/game.types";
import {
  FinancialsData,
  RoundAnalyticsI,
} from "../../types/roundAnalytics.types";
import { GameError } from "../../utils/errors/gameError";
import { bettingManager } from "../betting/bettingManager";

class RoundAnalyticsManager {
  private readonly config = {
    maxRetries: 3,
    baseDelayMs: 1000,
  } as const;

  /**
   * Saves initial round analytics during the preparing phase
   */
  async saveCompleteRoundResultsWithRetries(
    roundData: RoundAnalyticsI
  ): Promise<void> {
    let retries = 1;

    while (retries <= this.config.maxRetries) {
      try {
        const newRoundAnalytics = new RoundAnalyticsModel({
          roundId: roundData.roundId,
          totalPlayers: roundData.totalPlayers,
          roundPhase: roundData.roundPhase,
          provablyFairOutcome: roundData.provablyFairOutcome,
          financial: {
            houseProfit: 0,
            totalBetAmount: roundData.financial.totalBetAmount,
            totalCashoutAmount: 0,
          },
        });

        await newRoundAnalytics.save();

        return;
      } catch (err) {
        retries++;
        console.error(
          `[RoundAnalytics]: Failed to save analytics (attempt ${retries}/${this.config.maxRetries})`,
          err
        );

        if (retries < this.config.maxRetries) {
          // Exponential back-off
          const delay = Math.pow(this.config.baseDelayMs, retries);
          await this.sleep(delay);
        }
      }
    }

    throw new GameError({
      httpCode: 500,
      isOperational: false,
      internalMessage: `Failed to save round analytics after ${this.config.maxRetries} retries`,
      description: "An error occurred on our end. We are working on it",
    });
  }

  private async calculateRoundProfit({
    roundId,
    financialData,
    session,
  }: {
    roundId: string;
    financialData: Omit<FinancialsData, "houseProfit">;
    session: mongoose.ClientSession;
  }): Promise<void> {
    try {
      if (!roundId) {
        throw new GameError({
          description: "An error occurred on our end. We are working on it",
          httpCode: 500,
          internalMessage: "Missing required parameter: roundId",
          isOperational: false,
        });
      }

      if (!financialData) {
        throw new GameError({
          description: "An error occurred on our end. We are working on it",
          httpCode: 500,
          internalMessage: "Missing required parameter: financialData",
          isOperational: false,
        });
      }

      const { totalBetAmount, totalCashoutAmount } = financialData;

      if (
        typeof totalBetAmount !== "number" ||
        typeof totalCashoutAmount !== "number"
      ) {
        throw new GameError({
          description: "An error occurred on our end. We are working on it",
          httpCode: 500,
          internalMessage: `Invalid financial data - totalBetAmount: ${totalBetAmount}, totalCashoutAmount: ${totalCashoutAmount}`,
          isOperational: false,
        });
      }

      const houseProfit = totalBetAmount - totalCashoutAmount;

      const result = await RoundAnalyticsModel.findOneAndUpdate(
        {
          roundId,
          roundPhase: GamePhase.PREPARING,
        },
        {
          $set: {
            roundPhase: GamePhase.END,
            "financial.totalBetAmount": totalBetAmount,
            "financial.totalCashoutAmount": totalCashoutAmount,
            "financial.houseProfit": houseProfit,
          },
        },
        { session, new: true }
      );

      if (!result) {
        throw new GameError({
          description: "An error occurred on our end. We are working on it",
          httpCode: 500,
          internalMessage: `Round analytics not found for roundId: ${roundId}`,
          isOperational: false,
        });
      }

      console.log(
        `[RoundAnalytics]: Updated round ${roundId} - House profit: ${houseProfit}`
      );
    } catch (err) {
      console.error("[RoundAnalytics]: Error calculating round profit", err);

      throw new GameError({
        description: "An error occurred on our end. We are working on it",
        httpCode: 500,
        internalMessage: `Unexpected error calculating round profit: ${err}`,
        isOperational: false,
      });
    }
  }

  /**
   * Busts uncashed bets and calucate house profit in a transaction
   */
  async finalizeRoundOutcome({
    roundId,
    finalMultiplier,
    totalBetAmount,
    totalCashoutAmount,
  }: {
    roundId: string;
    finalMultiplier: number;
    totalBetAmount: number;
    totalCashoutAmount: number;
  }) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await bettingManager.bustUncashedBets({
        roundId,
        finalMultiplier,
        session,
      });

      await this.calculateRoundProfit({
        roundId,
        financialData: {
          totalBetAmount,
          totalCashoutAmount,
        },
        session,
      });

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      console.error(
        "[RoundAnalyticsManager]: Failed to finalize analytics",
        err
      );
      throw err;
    } finally {
      session.endSession();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default RoundAnalyticsManager;
