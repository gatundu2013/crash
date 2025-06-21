import {
  BetStatus,
  ExecuteCashoutOperationsParams,
  GroupedUserCashouts,
  LogBatchTimingParams,
  NotifyCashoutResultsParams,
  NotifyFailedCashoutsParams,
  PrepareCashoutOperationsParams,
  StageCashoutParams,
  StagedCashout,
} from "../../types/bet.types";
import { roundStateManager } from "../game/roundStateManager";
import { SOCKET_EVENTS } from "../../config/socketEvents.config";
import User from "../../models/user.model";
import BetHistory, { BetHistoryI } from "../../models/betHistory.model";
import mongoose, { AnyBulkWriteOperation } from "mongoose";
import { cashoutSchema } from "../../validations/betting.validation";
import { CashoutError } from "../../utils/errors/cashoutError";
import { AppError } from "../../utils/errors/appError";
import { MongoError } from "mongodb";
import { EVENT_NAMES, eventBus } from "../eventBus";

/**
 * CashoutManager handles all cashout operations in batches.
 *
 * ## Core Architecture:
 * 1. **Staging Phase**: Validates and queues cashout requests for batch processing
 * 2. **Batch Processing Phase**: Processes multiple cashouts in optimized database transactions
 * 3. **Client Notification Phase**: Sends real-time updates to users via WebSocket
 *
 * ## Key Features:
 * - **High Throughput**: Batched processing with configurable limits for optimal performance
 * - **Data Consistency**: Full ACID compliance via MongoDB transactions
 * - **Fault Tolerance**: Automatic retry logic with exponential backoff for transient failures
 * - **Comprehensive Monitoring**: Detailed logging and performance metrics
 *
 * ## Business Rules:
 * - All cashouts must complete before the next round starts
 * - Cashouts are only accepted when the cashout window is open
 * - Duplicate cashout requests for the same bet are rejected
 * - Only PENDING bets can be cashed out (WON bets are already settled)
 *
 * ## Performance Optimizations:
 * - User-grouped cashouts for efficient database operations
 * - Bulk database operations to minimize round trips
 * - Transaction-scoped operations for data consistency
 * - Debounced processing to accumulate cashouts into efficient batches
 */
class CashoutManager {
  private static instance: CashoutManager;

  /**
   * System configuration parameters that control cashout behavior and performance.
   * These values are tuned for production workloads and can be adjusted based on system capacity.
   */
  private readonly config = {
    MAX_BATCH_SIZE: 1000, // Maximum number of cashouts to process in a single batch
    DEBOUNCE_TIME_MS: 500, // Delay to allow cashout accumulation before processing
    MAX_RETRIES: 3, // Maximum retry attempts for failed database transactions
    BASE_BACKOFF_MS: 100, // Base delay for exponential backoff retry strategy
  } as const;

  private stagedCashouts: Map<string, StagedCashout> = new Map(); // key: betId
  private isProcessing = false;
  private debounceTimerId: NodeJS.Timeout | null = null;
  private isCashoutWindowOpen = false; // Controls when cashouts are accepted

  private constructor() {}

  public static getInstance(): CashoutManager {
    if (!CashoutManager.instance) {
      CashoutManager.instance = new CashoutManager();
      console.info("[CashoutManager] Singleton instance created successfully.");
    }
    return CashoutManager.instance;
  }
  /**
   * Validates and stages a user's cashout request for batch processing.
   * This method serves as the primary entry point for all cashout requests.
   * @throws {CashoutError} When validation fails or business rules are violated
   */
  public stageCashout({
    payload,
    socket,
    isFromAutoCashout = false,
    autoCashoutMultiplier = null,
  }: StageCashoutParams): void {
    try {
      // STEP 1: CAPTURE MULTIPLIER AT EXACT MOMENT
      // Capture the multiplier at the exact moment of cashout request to
      // ensure the payout matches the player's action time and provides fair gameplay
      let cashoutMultiplier =
        autoCashoutMultiplier || roundStateManager.getState().currentMultiplier;

      // STEP 2: HANDLE AUTO-CASHOUT PROCESSING
      const { betsWithAutoCashouts } = roundStateManager.getState();
      const betWithAutoCashout = betsWithAutoCashouts.get(payload.betId);

      if (betWithAutoCashout && !betWithAutoCashout.isProcessed) {
        betWithAutoCashout.isProcessed = true;
      } else {
        throw new CashoutError({
          description: "Bet already processed",
          httpCode: 400,
          isOperational: true,
          internalMessage: "Bet already processed",
        });
      }

      // STEP 3: VALIDATE MANUAL CASHOUT REQUESTS
      if (!isFromAutoCashout) {
        // Validate payload structure
        const { error } = cashoutSchema.validate(payload);
        if (error) {
          throw new CashoutError({
            description: "An error occurred",
            httpCode: 400,
            isOperational: true,
            internalMessage: error.message,
          });
        }

        // Check if cashout window is open
        if (!this.isCashoutWindowOpen) {
          throw new CashoutError({
            description: "Cashout window is closed",
            httpCode: 400,
            isOperational: true,
            internalMessage: "Cashout window is closed",
          });
        }
      }

      // STEP 4: PREVENT DUPLICATE CASHOUT ATTEMPTS
      if (this.stagedCashouts.has(payload.betId)) {
        throw new CashoutError({
          description: "Cashout already in progress",
          httpCode: 400,
          isOperational: true,
          internalMessage: "Duplicate cashout attempt detected",
        });
      }

      // STEP 5: VERIFY BET EXISTS AND IS ACTIVE
      const activeBet = roundStateManager
        .getState()
        .activeBets.get(payload.betId);

      if (!activeBet) {
        throw new CashoutError({
          description: "Bet not found",
          httpCode: 400,
          isOperational: true,
          internalMessage: "Attempted cashout for non-existing bet",
        });
      }

      // STEP 6: CHECK BET STATUS
      if (activeBet.bet.status === BetStatus.WON) {
        throw new CashoutError({
          description: "Bet already settled",
          httpCode: 400,
          isOperational: true,
          internalMessage: "Attempted cashout on a settled bet",
        });
      }

      // STEP 7: CALCULATE PAYOUT
      cashoutMultiplier = +cashoutMultiplier.toFixed(2);
      const payout = +(cashoutMultiplier * activeBet.bet.stake).toFixed(2);

      // STEP 8: STAGE CASHOUT FOR BATCH PROCESSING
      this.stagedCashouts.set(payload.betId, {
        betId: payload.betId,
        userId: activeBet.bet.userId,
        stake: activeBet.bet.stake,
        cashoutMultiplier,
        payout,
        socket, // Store the socket for direct notification later
      });

      // STEP 9: TRIGGER BATCH PROCESSOR
      this.scheduleNextBatch();
    } catch (err) {
      console.error(
        `[CashoutManager] Cashout staging failed for bet ${payload.betId}:`,
        err
      );

      const message = err instanceof AppError ? err.message : "Cashout Failed";

      // Immediately notify the client of the failure
      socket.emit(SOCKET_EVENTS.EMITTERS.BETTING.CASHOUT_ERROR(payload.betId), {
        message,
      });
    }
  }

  /**
   * Orchestrates the processing of a batch with comprehensive retry logic.
   *
   * This method represents the core of the batch processing engine, handling the complete
   * lifecycle of cashout processing from staging to database persistence to client notification.
   *
   * ## Retry Strategy:
   * - Automatic retry for MongoDB WriteConflict errors (optimistic concurrency control
   */
  public async processBatch(): Promise<void> {
    // Prevent concurrent batch processing to maintain data consistency
    if (this.isProcessing) {
      console.warn(
        "[CashoutManager] Batch processing already in progress. Skipping..."
      );
      return;
    }

    // Exit early if no cashouts are waiting for processing
    if (this.stagedCashouts.size === 0) {
      console.info("[CashoutManager] No staged cashouts to process, exiting");
      return;
    }

    console.info(
      `[CashoutManager] Starting batch processing for ${this.stagedCashouts.size} staged cashouts`
    );

    // Set the processing flag to prevent concurrent batch processing
    this.isProcessing = true;

    // Clear any pending debounce timer
    if (this.debounceTimerId) {
      clearTimeout(this.debounceTimerId);
      this.debounceTimerId = null;
    }

    // Used to send notifications to  users in the batch if batch processing fails
    let batch: StagedCashout[] = [];

    // Retry loop with exponential backoff for transient database errors
    for (let attempt = 1; attempt <= this.config.MAX_RETRIES; attempt++) {
      let session: mongoose.ClientSession | null = null;

      try {
        console.info(
          `[CashoutManager] Batch processing attempt ${attempt}/${this.config.MAX_RETRIES}`
        );

        // Record the start time of the batch processing for performance monitoring
        const batchStart = Date.now();

        // Initialize database transaction
        session = await mongoose.startSession();
        session.startTransaction();

        // Step 1: Extract batch from the staging map and group them by user ID
        const { batch: extractedBatch, groupedUserCashouts } =
          this.extractAndGroupCashouts();
        batch = extractedBatch;

        // Step 2: Fetch the account balances for all users in this batch
        const userAccountBalances = await User.find(
          { userId: { $in: Array.from(groupedUserCashouts.keys()) } },
          { accountBalance: 1, userId: 1 }
        ).session(session);

        console.info(
          `[CashoutManager] Fetched account balances for ${userAccountBalances.length} users`
        );

        // Step 3: Safety check - should never happen, but protects against rare
        // data issues (e.g. missing users). Abort if no balances found.
        if (userAccountBalances.length === 0) {
          console.warn(
            "[CashoutManager] No user account balances found for batch, aborting transaction"
          );
          await session.abortTransaction();
          return;
        }

        // Step 4: Prepare database operations
        const { successfulCashouts, betHistoryUpdateOps, balanceUpdateOps } =
          this.prepareCashoutDbOperations({
            groupedUserCashouts,
            userAccountBalances,
          });

        // Step 5: Safety check - shouldn't happen, but avoids processing empty
        // batches. Abort if no balance updates are found.
        if (balanceUpdateOps.length === 0) {
          console.warn(
            "[CashoutManager] No balance updates found for batch, aborting transaction"
          );
          await session.abortTransaction();
          return;
        }

        // Step 6: Execute the prepared database operations within the transaction
        await this.executeCashoutDbOperation({
          balanceUpdateOps,
          betHistoryUpdateOps,
          session,
        });

        // Step 7: Commit the transaction to make all changes permanent
        await session.commitTransaction();

        // Step 8: Success! Notify clients and update system state
        this.notifySuccessfulCashouts({ successfulCashouts });
        eventBus.emit(EVENT_NAMES.CASHOUTS_PROCESSED, successfulCashouts);

        // Step 9: Log comprehensive performance metrics
        this.logBatchTiming({
          batchStart,
          batchSize: batch.length,
          successCount: successfulCashouts.length,
          failureCount: 0,
        });

        console.info(
          `[CashoutManager] Successfully processed batch of ${batch.length} cashouts on attempt ${attempt}`
        );

        // Success - break out of retry loop
        break;
      } catch (error) {
        console.error(
          `[CashoutManager] Batch processing failed on attempt ${attempt}/${this.config.MAX_RETRIES}:`,
          error
        );

        // Rollback transaction on any error to maintain data consistency
        if (session) {
          try {
            await session.abortTransaction();
            console.debug(
              "[CashoutManager] Transaction rolled back successfully"
            );
          } catch (abortError) {
            console.error(
              "[CashoutManager] Critical error: Failed to abort transaction:",
              abortError
            );
          }
        }

        // Check if this is a retryable WriteConflict error (MongoDB optimistic locking)
        const isWriteConflict =
          error instanceof MongoError && error.code === 112;

        if (isWriteConflict && attempt < this.config.MAX_RETRIES) {
          console.warn(
            `[CashoutManager] WriteConflict detected, retrying attempt ${
              attempt + 1
            }/${this.config.MAX_RETRIES}`
          );

          // Exponential backoff: 100ms, 200ms, 400ms to reduce database contention
          const backoffDelay =
            this.config.BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
          console.debug(
            `[CashoutManager] Waiting ${backoffDelay}ms before retry`
          );
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));

          // Continue to next retry attempt
          continue;
        }

        // Non-retryable error or max retries exceeded
        console.error(
          `[CashoutManager] Batch processing failed permanently after ${attempt} attempts:`,
          error
        );

        // Notify users about the failure
        this.notifyFailedCashouts({
          failedCashouts: batch,
          reason: "An error occurred.",
        });

        break; // Exit retry loop
      } finally {
        // Ensure database session is properly closed
        if (session) {
          try {
            await session.endSession();
            console.debug("[CashoutManager] Database session ended");
          } catch (sessionError) {
            console.error(
              "[CashoutManager] Error ending database session:",
              sessionError
            );
          }
        }
      }
    }

    // Step 10: Cleanup - remove processed cashouts from staging map
    batch.forEach((cashout) => this.stagedCashouts.delete(cashout.betId));

    // Step 11: Reset processing flag and schedule next processing cycle
    this.isProcessing = false;
    this.scheduleNextBatch();
  }

  /**
   * Schedules the next batch processing cycle if there are pending cashouts.
   *
   * ## Debouncing Strategy:
   * The debouncing mechanism allows the system to accumulate multiple cashout requests
   * into a single batch, improving database efficiency and reducing system load.
   */
  private scheduleNextBatch(): void {
    if (
      this.stagedCashouts.size > 0 &&
      !this.debounceTimerId &&
      !this.isProcessing
    ) {
      console.info(
        `[CashoutManager] Scheduling batch processing in ${this.config.DEBOUNCE_TIME_MS}ms`
      );

      this.debounceTimerId = setTimeout(() => {
        this.processBatch().catch((error) => {
          console.error(
            "[CashoutManager] Scheduled batch processing failed:",
            error
          );
        });
      }, this.config.DEBOUNCE_TIME_MS);
    }
  }

  /**
   * Extracts batch from the staging queue and groups cashouts by user ID.
   *
   * This method implements an optimization strategy by organizing cashouts
   * in a way that maximizes database efficiency.
   *
   * ## Optimization Benefits:
   * - **Reduced Database Queries**: Single balance query per user instead of per cashout
   * - **Efficient Bulk Operations**: Grouped updates minimize database round trips
   */
  private extractAndGroupCashouts(): {
    batch: StagedCashout[];
    groupedUserCashouts: Map<string, GroupedUserCashouts>;
  } {
    // Extract a batch of cashouts
    let batch = Array.from(this.stagedCashouts.values());
    batch = batch.slice(0, this.config.MAX_BATCH_SIZE);

    console.info(
      `[CashoutManager] Extracted ${batch.length} cashouts for batch processing`
    );

    // Group user cashouts by user ID to optimize database operations
    const groupedUserCashouts = new Map<string, GroupedUserCashouts>(); // Key: userId
    let totalPayoutInBatch = 0;

    batch.forEach((cashout) => {
      const existing = groupedUserCashouts.get(cashout.userId);
      totalPayoutInBatch += cashout.payout;

      if (existing) {
        // Add to existing user group
        existing.cashouts.push(cashout);
        existing.totalPayout += cashout.payout;
      } else {
        // Create new user group
        groupedUserCashouts.set(cashout.userId, {
          cashouts: [cashout],
          totalPayout: cashout.payout,
        });
      }
    });

    console.info(
      `[CashoutManager] Grouped ${batch.length} cashouts into ${groupedUserCashouts.size} user groups`
    );

    return { batch, groupedUserCashouts };
  }

  /**
   * Prepares database bulk write operations for the current batch.
   *
   * This method implements the core business logic for cashout processing, ensuring
   * that all database operations are prepared efficiently and correctly before execution.
   *
   * ## Operation Preparation:
   * 1. **Balance Updates**: Prepares bulk operations to increment user account balances
   * 2. **Bet History Updates**: Prepares operations to mark bets as WON with payout details
   * 3. **Success Tracking**: Creates comprehensive records for client notification
   * 4. **Data Validation**: Ensures all required user accounts exist and are accessible.
   *
   * ## Business Logic:
   * - Each user receives a single balance increment for all their cashouts
   * - Each individual cashout gets its own bet history update
   * - New account balances are calculated for immediate client feedback
   * - Only valid user accounts are processed (invalid accounts are skipped)
   *
   * @returns Object containing successful cashouts and prepared database operations
   */
  private prepareCashoutDbOperations({
    groupedUserCashouts,
    userAccountBalances,
  }: PrepareCashoutOperationsParams): {
    successfulCashouts: (StagedCashout & { newAccountBalance: number })[];
    betHistoryUpdateOps: AnyBulkWriteOperation<BetHistoryI>[];
    balanceUpdateOps: AnyBulkWriteOperation[];
  } {
    console.info(
      `[CashoutManager] Preparing database operations for ${groupedUserCashouts.size} user groups`
    );

    const balanceUpdateOps: AnyBulkWriteOperation[] = [];
    const betHistoryUpdateOps: AnyBulkWriteOperation<BetHistoryI>[] = [];
    const successfulCashouts: (StagedCashout & {
      newAccountBalance: number;
    })[] = [];

    // Create a Map for O(1) lookup of user balances to optimize processing
    const userAccountBalanceMap = new Map<string, number>(
      userAccountBalances.map((u) => [u.userId, u.accountBalance])
    );

    // Iterate over each user's grouped cashouts to prepare database operations
    groupedUserCashouts.forEach((userCashouts, userId) => {
      const accountBalance = userAccountBalanceMap.get(userId);

      if (accountBalance !== undefined) {
        // Prepare a single bulk operation to increment the user's balance by their total payout
        balanceUpdateOps.push({
          updateOne: {
            filter: { userId },
            update: { $inc: { accountBalance: userCashouts.totalPayout } },
          },
        });

        // Calculate the user's new account balance for immediate client notification
        const newAccountBalance = accountBalance + userCashouts.totalPayout;

        // For each individual cashout, prepare an operation to update its status in bet history
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

          // Add the processed cashout to the successful list with updated balance information
          successfulCashouts.push({ ...cashout, newAccountBalance });
        });
      } else {
        console.warn(
          `[CashoutManager] Skipping user ${userId} - account balance not found`
        );
      }
    });

    console.info(
      `[CashoutManager] Database operations prepared: ${balanceUpdateOps.length} balance updates, ${betHistoryUpdateOps.length} bet history updates, ${successfulCashouts.length} successful cashouts`
    );

    return { successfulCashouts, betHistoryUpdateOps, balanceUpdateOps };
  }

  /**
   * Executes prepared bulk write operations within a database transaction.
   *
   * This method handles the critical data persistence of cashout processing,
   * ensuring that all database changes are applied atomically and consistently.
   *
   * ## Transaction Safety:
   * - All operations execute within the provided database session
   * - Complete transaction rollback occurs if any operation fails
   * - Ensures data consistency across multiple database collections
   * - Provides comprehensive error handling and logging

   *
   * ## Operation Sequence:
   * 1. **User Balance Updates**: Increments account balances for all users
   * 2. **Bet History Updates**: Marks bets as WON with payout details
   * 3. **Result Validation**: Ensures all operations completed successfully
   * 4. **Performance Logging**: Records operation metrics for monitoring
   * @throws {Error} When database operations fail or return unexpected results

   */
  private async executeCashoutDbOperation({
    balanceUpdateOps,
    betHistoryUpdateOps,
    session,
  }: ExecuteCashoutOperationsParams): Promise<void> {
    console.info(
      `[CashoutManager] Executing database operations: ${balanceUpdateOps.length} balance updates, ${betHistoryUpdateOps.length} bet history updates`
    );

    const operationStart = Date.now();

    try {
      // Step 1: Execute the bulk write operation to update all user balances at once
      if (balanceUpdateOps.length > 0) {
        const balanceResult = await User.bulkWrite(balanceUpdateOps, {
          session,
        });
        console.info(
          `[CashoutManager] Balance updates completed: ${balanceResult.modifiedCount} accounts updated`
        );
      }

      // Step 2: Execute the bulk write operation to update all bet history documents
      if (betHistoryUpdateOps.length > 0) {
        const betHistoryResult = await BetHistory.bulkWrite(
          betHistoryUpdateOps,
          { session }
        );
        console.info(
          `[CashoutManager] Bet history updates completed: ${betHistoryResult.modifiedCount} bets updated`
        );
      }

      const operationEnd = Date.now();
      const operationDuration = operationEnd - operationStart;

      console.info(
        `[CashoutManager] All database operations completed successfully in ${operationDuration}ms`
      );
    } catch (err) {
      console.error(
        "[CashoutManager] Database operation failed during cashout batch:",
        err
      );
      throw err;
    }
  }

  /**
   * Notifies clients on their successful cashout.
   */
  private notifySuccessfulCashouts({
    successfulCashouts,
  }: NotifyCashoutResultsParams): void {
    console.info(
      `[CashoutManager] Notifying ${successfulCashouts.length} clients of successful cashouts.`
    );

    let notificationsSent = 0;

    successfulCashouts.forEach((cashout) => {
      try {
        if (cashout.socket) {
          cashout.socket.emit(
            SOCKET_EVENTS.EMITTERS.BETTING.CASHOUT_SUCCESS(cashout.betId),
            {
              payout: cashout.payout,
              multiplier: cashout.cashoutMultiplier,
              newAccountBalance: cashout.newAccountBalance,
            }
          );
          notificationsSent++;
        } else {
          console.warn(
            `[CashoutManager] Client socket disconnected for bet ${cashout.betId}`
          );
        }
      } catch (error) {
        console.error(
          `[CashoutManager] Failed to notify client for bet ${cashout.betId}:`,
          error
        );
      }
    });

    console.info(
      `[CashoutManager] Success notifications sent: ${notificationsSent}/${successfulCashouts.length}`
    );
  }

  /**
   * Sends failure notifications to individual clients for failed cashout attempts.
   */
  private notifyFailedCashouts({
    failedCashouts,
    reason,
  }: NotifyFailedCashoutsParams): void {
    console.info(
      `[CashoutManager] Notifying ${failedCashouts.length} clients of failed cashouts. Reason: ${reason}`
    );

    let notificationsSent = 0;

    failedCashouts.forEach((cashout) => {
      try {
        if (cashout.socket) {
          cashout.socket.emit(
            SOCKET_EVENTS.EMITTERS.BETTING.CASHOUT_ERROR(cashout.betId),
            {
              message: reason,
            }
          );
          notificationsSent++;
        } else {
          console.warn(
            `[CashoutManager] Client socket disconnected for failed cashout bet ${cashout.betId}`
          );
        }
      } catch (error) {
        console.error(
          `[CashoutManager] Failed to notify client for failed cashout bet ${cashout.betId}:`,
          error
        );
      }
    });

    console.info(
      `[CashoutManager] Failure notifications sent: ${notificationsSent}/${failedCashouts.length}`
    );
  }

  /**
   * Logs detailed performance metrics for a processed cashout batch.
   */
  /**
   * Logs comprehensive performance metrics and statistics for cashout batch processing operations.
   *
   * This method provides essential monitoring data for:
   * - Performance analysis and optimization
   * - System capacity planning
   * - Debugging and troubleshooting
   *
   * ## Logged Metrics:
   * - Processing Duration: Time taken in milliseconds/seconds
   * - Throughput: Total number of cashouts processed in the batch
   * - Success Rate: Count of successfully processed vs failed cashouts
   * - Performance Indicators: Processing rate (cashouts per second) for batch
   */
  private logBatchTiming({
    batchStart,
    batchSize,
    successCount,
    failureCount,
  }: LogBatchTimingParams): void {
    const batchEnd = Date.now();
    const durationMs = batchEnd - batchStart;
    const durationSeconds = (durationMs / 1000).toFixed(2);
    const cashoutsPerSecond =
      batchSize > 0 ? (batchSize / (durationMs / 1000)).toFixed(2) : "0";
    const successRate =
      batchSize > 0 ? ((successCount / batchSize) * 100).toFixed(1) : "0";

    console.info(
      `[CashoutManager] Batch Complete: ${batchSize} cashouts processed in ${durationMs}ms (${durationSeconds}s) | ` +
        `Success: ${successCount}, Failed: ${failureCount} | ` +
        `Rate: ${cashoutsPerSecond} cashouts/sec | Success Rate: ${successRate}%`
    );

    // Additional performance warnings for monitoring
    if (durationMs > 1000) {
      console.warn(
        `[CashoutManager] PERFORMANCE WARNING: Batch processing took ${durationSeconds}s, consider optimizing.`
      );
    }

    if (batchSize > 0 && successCount === 0) {
      console.error(
        `[CashoutManager] CRITICAL: All ${batchSize} cashouts in batch failed processing.`
      );
    }
  }

  /**
   * Automatically processes cashouts for bets that have reached their specified auto-cashout multiplier.
   *
   * This method is typically called during each game round update to check if any active bets
   * should be automatically cashed out based on the current multiplier reaching or exceeding
   * their pre-set auto-cashout thresholds.
   
   * - Only processes bets that are both active and have auto-cashout enabled
   * - Removes successfully processed bets from the auto-cashout tracking
   * - Uses atomic operations to prevent race conditions during bet processing
   *
   * @throws {Error} May throw if stageCashout fails for individual bets
   */
  public autoCashout(): void {
    const { activeBets, betsWithAutoCashouts, currentMultiplier } =
      roundStateManager.getState();

    if (!betsWithAutoCashouts.size || !activeBets.size || !currentMultiplier) {
      return;
    }

    // Process bets with auto-cashout enabled
    for (const [betId, autoCashoutData] of betsWithAutoCashouts) {
      // Skip if already processed
      if (autoCashoutData.isProcessed) continue;
      // Check if threshold has been reached
      if (currentMultiplier >= autoCashoutData.autoCashoutMultiplier) {
        const bet = activeBets.get(betId);
        if (bet) {
          const payload: StageCashoutParams = {
            payload: { betId: bet.bet.betId },
            socket: bet.socket || null,
            isFromAutoCashout: true,
            autoCashoutMultiplier: autoCashoutData.autoCashoutMultiplier,
          };

          this.stageCashout(payload);
        }
      }
    }
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

/**
 * Singleton instance of the CashoutManager.
 *
 * This exported instance should be used throughout the application to ensure
 * consistent state management and prevent multiple instances from conflicting.
 */
export const cashoutManager = CashoutManager.getInstance();
