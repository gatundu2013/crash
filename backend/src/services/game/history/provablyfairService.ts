import RoundAnalyticsModel from "../../../models/roundAnalytics.model";
import { AppError } from "../../../utils/errors/appError";

export async function getProvablyFairResultService(roundId: string) {
  try {
    const result = await RoundAnalyticsModel.findOne(
      { roundId },
      { _id: 0, provablyFairOutcome: 1, roundCount: 1, createdAt: 1 }
    ).lean();

    if (!result) {
      throw new AppError({
        httpCode: 404,
        description: `No provably fair result found for roundId: ${roundId}`,
        isOperational: true,
      });
    }

    delete result?.provablyFairOutcome?.rawMultiplier;

    return result;
  } catch (err) {
    throw err;
  }
}
