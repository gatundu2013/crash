import {
  BetStatus,
  GroupedUserCashouts,
  StageCashoutParams,
  StagedCashout,
  userAccountBalance,
} from "../../types/bet.types";
import { roundStateManager } from "../game/roundStateManager";
import { SOCKET_EVENTS } from "../../config/socketEvents.config";
import User from "../../models/user.model";
import BetHistory, { BetHistoryDoc } from "../../models/betHistory.model";
import mongoose, { AnyBulkWriteOperation } from "mongoose";
import { cashoutSchema } from "../../validations/betting.validation";
import { CashoutError } from "../../utils/errors/cashoutError";
import { AppError } from "../../utils/errors/appError";
import { MongoError } from "mongodb";
import { EVENT_NAMES, eventBus } from "../eventBus";

/**
 * Handles all player cashouts for the game (singleton).
 *
 * - Stages, batches, and processes cashouts in transactions.
 * - Notifies clients and updates game state.
 *
 * All cashouts must finish before the next round starts.
 */
class CashoutManager {
  private static instance: CashoutManager;

  private readonly config = {
    MAX_BATCH_SIZE: 1000,
    DEBOUNCE_TIME_MS: 500,
    MAX_RETRIES: 3,
    BASE_BACKOFF_MS: 100,
  };

  private stagedCashouts: Map<string, StagedCashout> = new Map();
  private isProcessing = false;
  private debounceTimerId: NodeJS.Timeout | null = null;
  private isCashoutWindowOpen = false;

  private constructor() {}

  public static getInstance(): CashoutManager {
    if (!CashoutManager.instance) {
      CashoutManager.instance = new CashoutManager();
    }
    return CashoutManager.instance;
  }

  /**
   * Validates and stages a user's cashout request for batch processing.
   */
  public stageCashout({ payload, socket }: StageCashoutParams): void {
    try {
      // Capture the multiplier at the moment of cashout request to
      // ensure the payout matches the player's action time.
      let cashoutMultiplier = roundStateManager.getState().currentMultiplier;

      // 1. Validate cashout payload.
      const { error } = cashoutSchema.validate(payload);
      if (error) {
        throw new CashoutError({
          description: "An error occured",
          httpCode: 400,
          isOperational: true,
          internalMessage: error.message,
        });
      }

      // 2. Ensure cashout window is open.
      if (!this.isCashoutWindowOpen) {
        throw new CashoutError({
          description: "Cashout window is closed",
          httpCode: 400,
          isOperational: true,
          internalMessage: "Attempted cashout outside cashout window",
        });
      }

      // 3. Prevent duplicate cashout requests for the same bet ID.
      if (this.stagedCashouts.has(payload.betId)) {
        throw new CashoutError({
          description: "Cashout already in progress",
          httpCode: 400,
          isOperational: true,
          internalMessage: "Duplicate cashout attempt detected",
        });
      }

      // 4. Verify that the bet exists in the current round bets.
      const activeBet = roundStateManager.getState().betsMap.get(payload.betId);
      if (!activeBet) {
        throw new CashoutError({
          description: "Bet not found",
          httpCode: 400,
          isOperational: true,
          internalMessage: "No active bet found for given betId",
        });
      }

      // 5. Reject cashout - Bet is already settled.
      if (activeBet.bet.status === BetStatus.WON) {
        throw new CashoutError({
          description: "Bet already settled",
          httpCode: 400,
          isOperational: true,
          internalMessage: "Attempted cashout on a settled bet",
        });
      }

      // 6. Calculate payout
      cashoutMultiplier = +cashoutMultiplier.toFixed(2);
      const payout = +(cashoutMultiplier * activeBet.bet.stake).toFixed(2);

      // 7. Cashout is valid - Stage.
      this.stagedCashouts.set(payload.betId, {
        betId: payload.betId,
        userId: activeBet.bet.userId,
        stake: activeBet.bet.stake,
        cashoutMultiplier,
        payout,
        socket, // Store the socket for direct notification later.
      });

      // 8. Start the batch processor if it's not already scheduled or running.
      this.scheduleNextBatch();
    } catch (err) {
      console.error("Cashout Error:", err);
      const message = err instanceof AppError ? err.message : "Cashout Failed";
      socket.emit(SOCKET_EVENTS.EMITTERS.BETTING.CASHOUT_ERROR(payload.betId), {
        message,
      });
    }
  }

  /**
   * Orchestrates the processing of a batch of staged cashouts with proper retry logic.
   * This function is the core of the batch processing logic, handling everything.
   * It is designed to run sequentially and will not execute if another batch is already being processed.
   */
  public async processBatch(): Promise<void> {
    if (this.isProcessing) {
      console.warn("[CashoutManager]: Another batch is already processing");
      return;
    }

    if (this.stagedCashouts.size === 0) {
      console.warn("[CashoutManager]: No cashouts to process");
      return;
    }

    // Set the processing flag to prevent concurrent batch processing.
    this.isProcessing = true;

    // Clear any pending debounce timer since we're processing now
    if (this.debounceTimerId) {
      clearTimeout(this.debounceTimerId);
      this.debounceTimerId = null;
    }

    // Used to send notification to users of the batch if batch processing fails
    let batch: StagedCashout[] = [];

    for (let attempt = 1; attempt <= this.config.MAX_RETRIES; attempt++) {
      let session: mongoose.ClientSession | null = null;

      try {
        // Record the start time of the batch processing.
        const batchStart = Date.now();

        // Start transaction.
        session = await mongoose.startSession();
        session.startTransaction();

        // Extract batch from the staging map and group them by user ID.
        const { batch: btc, groupedUserCashouts } =
          this.extractAndGroupCashouts();
        batch = btc;

        // Fetch the account balances for the users involved in the batch.
        const userIds = Array.from(groupedUserCashouts.keys());
        const userAccountBalances = await User.find(
          { userId: { $in: userIds } },
          { accountBalance: 1, userId: 1 }
        ).session(session);

        // Extra check: Should never happen, but protects against rare
        // data issues (e.g. missing users). Abort if no balances found.
        if (userAccountBalances.length === 0) {
          await session.abortTransaction();
          console.warn(
            "[CashoutManager]: No user account balances found for batch"
          );
          return;
        }

        // Prepare the database operations for the batch of cashouts.
        const { successfulCashouts, betHistoryUpdateOps, balanceUpdateOps } =
          this.prepareCashoutDbOperations({
            groupedUserCashouts,
            userAccountBalances,
          });

        // Extra check: Shouldn't happen, but avoids processing empty
        // batches. Abort if no balance updates.
        if (balanceUpdateOps.length === 0) {
          await session.abortTransaction();
          console.warn(
            "[CashoutManager]: No balance updates required for batch"
          );
          return;
        }

        // Execute the prepared database operations within the transaction.
        await this.executeCashoutDbOperation({
          balanceUpdateOps,
          betHistoryUpdateOps,
          session,
        });

        // Commit the transaction.
        await session.commitTransaction();

        // Success! Notify clients and update state
        this.notifySuccessfulCashouts({ successfulCashouts });
        eventBus.emit(EVENT_NAMES.CASHOUTS_PROCESSED, successfulCashouts);

        this.logBatchTiming({
          batchStart,
          batchSize: batch.length,
          successCount: successfulCashouts.length,
          failureCount: 0,
        });

        console.log(
          `[CashoutManager]: Successfully processed batch of ${batch.length} cashouts on attempt ${attempt}`
        );

        // Success - break out of retry loop
        break;
      } catch (error) {
        console.error(
          `[CashoutManager] Error on attempt ${attempt}/${this.config.MAX_RETRIES}:`,
          error
        );

        // Abort transaction if it exists
        if (session) {
          try {
            await session.abortTransaction();
          } catch (abortError) {
            console.error(
              "[CashoutManager] Error aborting transaction:",
              abortError
            );
          }
        }

        // Check if this is a retryable WriteConflict error
        const isWriteConflict =
          error instanceof MongoError && error.code === 112;

        if (isWriteConflict && attempt < this.config.MAX_RETRIES) {
          console.log(
            `[CashoutManager] WriteConflict detected, retrying attempt ${
              attempt + 1
            }/${this.config.MAX_RETRIES}`
          );

          // Exponential backoff: 100ms, 200ms, 400ms
          const backoffDelay =
            this.config.BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));

          // Continue to next retry attempt
          continue;
        }

        // Non-retryable error or max retries exceeded
        console.error(
          `[CashoutManager] Failed after ${attempt} attempts. Error:`,
          error
        );

        // Notify users about the failure
        this.notifyFailedCashouts({
          failedCashouts: batch,
          reason: "An errors occured.",
        });

        break; // Exit retry loop
      } finally {
        // Always clean up session
        if (session) {
          try {
            await session.endSession();
          } catch (endError) {
            console.error("[CashoutManager] Error ending session:", endError);
          }
        }
      }
    }

    // Clean up processed cashouts (remove from staging map)
    batch.forEach((cashout) => this.stagedCashouts.delete(cashout.betId));

    // Reset processing flag
    this.isProcessing = false;

    // Schedule next batch if there are more cashouts waiting
    this.scheduleNextBatch();
  }

  /**
   * Schedules the next batch processing if there are pending cashouts
   */
  private scheduleNextBatch(): void {
    if (
      this.stagedCashouts.size > 0 &&
      !this.debounceTimerId &&
      !this.isProcessing
    ) {
      this.debounceTimerId = setTimeout(() => {
        this.processBatch().catch(console.error);
      }, this.config.DEBOUNCE_TIME_MS);
    }
  }

  /**
   * Extracts batch from the queue and groups cashouts by user ID.
   * This optimizes database operations by allowing updates to be consolidated per user.
   */
  private extractAndGroupCashouts(): {
    batch: StagedCashout[];
    groupedUserCashouts: Map<string, GroupedUserCashouts>;
  } {
    // Take a chunk of cashouts from staged cashouts.
    const batch = Array.from(this.stagedCashouts.values()).slice(
      0,
      this.config.MAX_BATCH_SIZE
    );

    // Group similar users together to optimize database operations.
    const groupedUserCashouts = new Map<string, GroupedUserCashouts>();
    batch.forEach((cashout) => {
      const existing = groupedUserCashouts.get(cashout.userId);

      if (existing) {
        existing.cashouts.push(cashout);
        existing.totalPayout += cashout.payout;
      } else {
        groupedUserCashouts.set(cashout.userId, {
          cashouts: [cashout],
          totalPayout: cashout.payout,
        });
      }
    });

    return { batch, groupedUserCashouts };
  }

  /**
   * Prepares database bulk write operations for batch
   */
  private prepareCashoutDbOperations({
    groupedUserCashouts,
    userAccountBalances,
  }: PrepareCashoutOperationsParams): {
    successfulCashouts: (StagedCashout & { newAccountBalance: number })[];
    betHistoryUpdateOps: AnyBulkWriteOperation<BetHistoryDoc>[];
    balanceUpdateOps: AnyBulkWriteOperation[];
  } {
    const balanceUpdateOps: AnyBulkWriteOperation[] = [];
    const betHistoryUpdateOps: AnyBulkWriteOperation<BetHistoryDoc>[] = [];
    const successfulCashouts: (StagedCashout & {
      newAccountBalance: number;
    })[] = [];

    // Create a Map for O(1) lookup of user balances.
    const userAccountBalanceMap = new Map<string, number>(
      userAccountBalances.map((u) => [u.userId, u.accountBalance])
    );

    // Iterate over each user's grouped cashouts to prepare DB operations.
    groupedUserCashouts.forEach((userCashouts, userId) => {
      const accountBalance = userAccountBalanceMap.get(userId);

      if (accountBalance !== undefined) {
        // Prepare a single bulk operation to increment the user's balance by their total payout.
        balanceUpdateOps.push({
          updateOne: {
            filter: { userId },
            update: { $inc: { accountBalance: userCashouts.totalPayout } },
          },
        });

        // Calculate the user's new account balance for notification purposes.
        const newAccountBalance = accountBalance + userCashouts.totalPayout;

        // For each individual cashout, prepare an operation to update its status in the bet history.
        userCashouts.cashouts.forEach((cashout) => {
          betHistoryUpdateOps.push({
            updateOne: {
              filter: { betId: cashout.betId, status: BetStatus.PENDING },
              update: {
                $set: {
                  payout: cashout.payout,
                  cashoutMultiplier: cashout.cashoutMultiplier,
                  status: BetStatus.WON,
                },
              },
            },
          });

          // Add the processed cashout to the list of successful cashouts, annotated with the new balance.
          successfulCashouts.push({ ...cashout, newAccountBalance });
        });
      }
    });

    return { successfulCashouts, betHistoryUpdateOps, balanceUpdateOps };
  }

  /**
   * Executes prepared bulk write operations within a database transaction.
   */
  private async executeCashoutDbOperation({
    balanceUpdateOps,
    betHistoryUpdateOps,
    session,
  }: ExecuteCashoutOperationsParams): Promise<void> {
    // Execute the bulk write operation to update all user balances at once.
    if (balanceUpdateOps.length > 0) {
      await User.bulkWrite(balanceUpdateOps, { session });
    }

    // Execute the bulk write operation to update all bet history documents at once.
    if (betHistoryUpdateOps.length > 0) {
      await BetHistory.bulkWrite(betHistoryUpdateOps, { session });
    }
  }

  /**
   * Notifies clients about the results of their successful cashout attempts.
   */
  private notifySuccessfulCashouts({
    successfulCashouts,
  }: NotifyCashoutResultsParams): void {
    // Notify each user whose cashout was successful.
    successfulCashouts.forEach((cashout) => {
      if (cashout.socket) {
        cashout.socket.emit(
          SOCKET_EVENTS.EMITTERS.BETTING.CASHOUT_SUCCESS(cashout.betId),
          {
            payout: cashout.payout,
            multiplier: cashout.cashoutMultiplier,
            newAccountBalance: cashout.newAccountBalance,
          }
        );
      }
    });
  }

  /**
   * Sends failure notifications to individual clients.
   */
  private notifyFailedCashouts({
    failedCashouts,
    reason,
  }: NotifyFailedCashoutsParams): void {
    // Iterate through the list of failed cashouts and send a specific error message.
    failedCashouts.forEach((cashout) => {
      if (cashout.socket) {
        cashout.socket.emit(
          SOCKET_EVENTS.EMITTERS.BETTING.CASHOUT_ERROR(cashout.betId),
          {
            message: reason,
          }
        );
      }
    });
  }

  /**
   * Logs performance metrics for a processed batch.
   */
  private logBatchTiming({
    batchStart,
    batchSize,
    successCount,
    failureCount,
  }: LogBatchTimingParams): void {
    // Calculate the total processing time for the batch.
    const batchEnd = Date.now();
    // Log detailed performance metrics to the console for monitoring.
    console.log(
      `[CashoutManager] Batch processed in ${
        batchEnd - batchStart
      }ms. Size: ${batchSize}, Success: ${successCount}, Failed: ${failureCount}`
    );
  }

  public openCashoutWindow(): void {
    this.isCashoutWindowOpen = true;
    console.log("[CashoutManager] Cashout window opened");
  }

  public closeCashoutWindow(): void {
    this.isCashoutWindowOpen = false;
    console.log("[CashoutManager] Cashout window closed");
  }

  /**
   * Retrieves the current operational state of the manager.
   * Useful for monitoring and debugging.
   */
  public getState(): {
    stagedCount: number;
    isProcessing: boolean;
    isCashoutWindowOpen: boolean;
    hasScheduledBatch: boolean;
  } {
    return {
      stagedCount: this.stagedCashouts.size,
      isProcessing: this.isProcessing,
      isCashoutWindowOpen: this.isCashoutWindowOpen,
      hasScheduledBatch: this.debounceTimerId !== null,
    };
  }
}

export const cashoutManager = CashoutManager.getInstance();

// Interfaces
interface PrepareCashoutOperationsParams {
  groupedUserCashouts: Map<string, GroupedUserCashouts>;
  userAccountBalances: userAccountBalance[];
}

interface ExecuteCashoutOperationsParams {
  balanceUpdateOps: AnyBulkWriteOperation[];
  betHistoryUpdateOps: AnyBulkWriteOperation<BetHistoryDoc>[];
  session: mongoose.ClientSession;
}

interface NotifyCashoutResultsParams {
  successfulCashouts: (StagedCashout & { newAccountBalance: number })[];
}

interface NotifyFailedCashoutsParams {
  failedCashouts: StagedCashout[];
  reason: string;
}

interface LogBatchTimingParams {
  batchStart: number;
  batchSize: number;
  successCount: number;
  failureCount: number;
}
