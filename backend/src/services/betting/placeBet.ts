import mongoose from "mongoose";
import User from "../../models/user.model";
import { BetStatus, BettingPayload } from "../../types/bet.types";
import BetHistory from "../../models/betHistory.model";
import { RoundStateManager } from "../game/roundStateManager";
import { BettingError } from "../../utils/errors/bettingError";
import { GamePhase } from "../../types/game.types";

export async function placeBetService(
  params: BettingPayload
): Promise<{ success: boolean; newAccountBalance: number }> {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // if (
    //   RoundStateManager.getInstance().getState().gamePhase !== GamePhase.BETTING
    // ) {
    //   throw new BettingError({
    //     description: "Betting period has expired.",
    //     httpCode: 400,
    //     isOperational: true,
    //   });
    // }

    const { stake, userId, autoCashoutMultiplier, clientSeed } = params;

    const user = await User.findById(userId).session(session);

    if (!user) {
      throw new BettingError({
        description: "Failed. User does not exist",
        httpCode: 400,
        isOperational: true,
      });
    }

    if (stake > user.accountBalance) {
      throw new BettingError({
        description: "Insufficient balance",
        httpCode: 400,
        isOperational: true,
      });
    }

    const newAccountBalance = user.accountBalance - stake;
    user.accountBalance = newAccountBalance;

    user.save({ session });

    // create bet history
    const newBet = await BetHistory.create(
      [
        {
          roundId: RoundStateManager.getInstance().getState().roundId,
          userId,
          stake,
          payout: null,
          cashoutMultiplier: null,
          finalMultiplier: null,
          autoCashoutMultiplier,
          status: BetStatus.PENDING,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    RoundStateManager.getInstance().addBet({
      userId: newBet[0].userId,
      betId: (newBet[0] as any)._id.toString(),
      payout: newBet[0].payout,
      status: newBet[0].status,
      stake: newBet[0].stake,
      autoCashoutMultiplier: newBet[0].autoCashoutMultiplier,
      cashoutMultiplier: newBet[0].cashoutMultiplier as number | null,
    });

    RoundStateManager.getInstance().updateClientSeed({
      seed: clientSeed,
      userId,
    });

    console.log(Date.now() / 1000);

    return { success: true, newAccountBalance };
  } catch (err) {
    await session.abortTransaction();

    console.error("Failed to placeBet:", err);

    throw err;
  } finally {
    session.endSession();
  }
}
