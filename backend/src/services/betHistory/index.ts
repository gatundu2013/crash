import BetHistory from "../../models/betHistory.model";
import { BetStatus } from "../../types/bet.types";
import { GetBetHistoryParams } from "../../types/betHistory.types";
import { AppError } from "../../utils/errors/appError";

export const getPaginatedBetHistoryService = async (
  params: GetBetHistoryParams
) => {
  try {
    const { userId, page } = params;
    const limit = 10;
    const skipDocs = (page - 1) * limit;

    const betHistory = await BetHistory.find(
      { userId, status: { $ne: BetStatus.PENDING } },
      {
        _id: 0,
        betId: 1,
        stake: 1,
        payout: 1,
        cashoutMultiplier: 1,
        finalMultiplier: 1,
        autoCashoutMultiplier: 1,
        createdAt: 1,
      }
    )
      .sort({ createdAt: -1 })
      .skip(skipDocs)
      .limit(limit)
      .lean();

    console.log(
      `Fetched ${betHistory.length} records for user ${userId} on page ${page}`
    );
    return betHistory;
  } catch (err) {
    throw new AppError({
      description: "Failed to fetch bet history",
      httpCode: 500,
      internalMessage: err instanceof Error ? err.message : String(err),
      isOperational: false,
    });
  }
};
