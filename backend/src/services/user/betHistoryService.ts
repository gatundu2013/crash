import BetHistory from "../../models/betHistory.model";
import { BetStatus } from "../../types/backend/bet.types";
import { GetBetHistoryParams } from "../../types/shared/api/betHistory.types";

export async function getPaginatedBetHistoryService(
  params: GetBetHistoryParams
) {
  const { userId, page } = params;

  const limit = 10;
  const skip = (page - 1) * limit;

  try {
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
      .skip(skip)
      .limit(limit)
      .lean();

    return betHistory;
  } catch (err) {
    throw err;
  }
}
