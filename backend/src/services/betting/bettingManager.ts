import { SOCKET_EVENTS } from "../../config/socketEvents.config";
import { v4 as uuidv4 } from "uuid";
import User from "../../models/user.model";
import mongoose, { AnyBulkWriteOperation } from "mongoose";
import { AccountStatus } from "../../types/user.types";
import { EVENT_NAMES, eventBus } from "../game/eventBus";
import { bettingSchema } from "../../validations/betting.validation";
import { BettingError } from "../../utils/errors/bettingError";
import { AppError } from "../../utils/errors/appError";
import { MongoError } from "mongodb";
import BetHistory, { BetHistoryI } from "../../models/betHistory.model";
import {
  AcceptedBet,
  BatchLogsParams,
  BetStatus,
  ExecuteDatabaseOperationsParams,
  FailedBetInfo,
  GroupedUserBets,
  StageBetParams,
  StagedBet,
  ValidateBetsParams,
} from "../../types/bet.types";
import { GameError } from "../../utils/errors/gameError";

/**
 * BettingManager handles all bet placement operations by grouping bets and processing them in batches.
 *
 * ## Core Architecture:
 * 1. Staging Phase
 * 2. Batch Processing Phase
 * 3. Client Notification Phase
 *
 * ## Key Features:
 * - **High Throughput**: Batched processing with configurable limits
 * - **Data Consistency**: Full ACID compliance via MongoDB transactions
 * - **Fault Tolerance**: Retry logic with exponential backoff
 * - **Resource Protection**: User bet limits and system overload prevention
 * - **Real-time Updates**: WebSocket notifications for immediate user feedback
 * - **Comprehensive Monitoring**: Detailed logging and performance metrics
 */
class BettingManager {
  private static instance: BettingManager;

  /**
   * System configuration parameters that control betting behavior and performance.
   * These values are tuned for production workloads and can be adjusted based on system capacity.
   */
  private readonly config = {
    MAX_BETS_PER_USER: 2, // Maximum number of concurrent bets allowed per user
    MAX_BATCH_SIZE: 212, // Maximum number of bets to process in a batch
    DEBOUNCE_TIME_MS: 500, // Allows bet accumulation before processing
    MAX_RETRIES: 2, // Retry attempts for failed database transactions
    BASE_BACKOFF_MS: 200, // Time before next retry attempt
  } as const;

  private isProcessing = false;
  private isBettingWindowOpen = false;
  private debounceTimerId: NodeJS.Timeout | null = null;
  private currentRoundId: string | null = null;
  private readonly stagedBets: Map<string, StagedBet> = new Map(); // key:betId
  // Tracks user bets to enforce bet placement limit. Key: userId value: Set of betIds
  private readonly userIdsToBetIds: Map<string, Set<string>> = new Map();

  private constructor() {}

  public static getInstance(): BettingManager {
    if (!BettingManager.instance) {
      BettingManager.instance = new BettingManager();
    }
    return BettingManager.instance;
  }

  /**
   * Stages a bet for batch processing after validation.
   * This is the main entry point for all incoming bets.
   * @throws {BettingError} When validation fails or business rules are violated
   */
  public async stageBet(params: StageBetParams): Promise<void> {
    const { payload, socket } = params;

    try {
      // Validation 1: Betting payload validation
      const { error } = bettingSchema.validate(payload);

      if (error) {
        // Only expose stake validation errors
        // Any other error would be due to developer error
        const message =
          error.details[0].context?.label?.trim() === "stake"
            ? error.message
            : "Failed to place bet";

        throw new BettingError({
          internalMessage: error.message,
          description: message,
          httpCode: 400,
          isOperational: true,
        });
      }

      // Validation 2: Business rule - betting window must be open
      if (!this.isBettingWindowOpen) {
        throw new BettingError({
          internalMessage: "Betting window is closed",
          description: "Betting window is closed",
          httpCode: 400,
          isOperational: true,
        });
      }

      // Validation 3: Anti-abuse - enforce per-user bet limits
      if (this.userHasMaxBets(payload.userId)) {
        throw new BettingError({
          internalMessage: "User has reached maximum concurrent bets",
          description: "You have reached the maximum number of concurrent bets",
          httpCode: 400,
          isOperational: true,
        });
      }

      // Generate unique identifier for this bet
      const betId = uuidv4();

      // Track user's bet to enforce limits and prevent manipulation
      const userBetIds = this.userIdsToBetIds.get(payload.userId) || new Set();
      userBetIds.add(betId);
      this.userIdsToBetIds.set(payload.userId, userBetIds);

      // Stage the bet for batch processing
      const betToStage: StagedBet = {
        payload: { ...payload, betId },
        socket,
      };
      this.stagedBets.set(betId, betToStage);

      // Trigger batch processing if conditions are met
      this.scheduleNextBatch();
    } catch (err) {
      const message =
        err instanceof AppError ? err.description : "Failed to place bet";

      // Notify client of the failure
      socket.emit(
        SOCKET_EVENTS.EMITTERS.BETTING.PLACE_BET_ERROR(payload.storeId),
        { message }
      );
    }
  }

  /**
   * Core batch processing engine that handles all staged bets in optimized database transactions.
   *
   * ## Processing Pipeline:
   * 1. **Concurrency Control**: Prevents multiple batch operations from running simultaneously
   * 2. **Batch Extraction**: Groups bets by user for efficient validation and processing
   * 3. **Balance Validation**: Ensures users have sufficient funds for their bets
   * 4. **Database Transaction**: Atomically updates balances and creates bet records
   * 5. **Client Notification**: Sends success/failure messages via WebSocket
   * 6. **Event Broadcasting**: Notifies other system components of accepted bets
   *
   * ## Retry Logic:
   * - Automatic retry for MongoDB WriteConflict errors (optimistic concurrency control)
   * - Exponential backoff to reduce database load during high contention
   * - Maximum retry limit to prevent infinite loops
   *
   * ## Performance Optimizations:
   * - Bulk database operations to minimize round trips
   * - User grouping to reduce duplicate balance queries
   * - Transaction-scoped operations for data consistency
   */
  private async processBatch(): Promise<void> {
    // Prevent concurrent batch processing
    if (this.isProcessing) {
      return;
    }

    // Exit early if no bets are waiting for processing
    if (this.stagedBets.size === 0) {
      return;
    }

    // console.info(
    //   `[BettingManager] Starting batch processing for ${this.stagedBets.size} staged bets.`
    // );

    // Set processing flag to prevent concurrent executions
    this.isProcessing = true;

    // Clear debounce timer since we're now processing
    if (this.debounceTimerId) {
      clearTimeout(this.debounceTimerId);
      this.debounceTimerId = null;
    }

    let batch: StagedBet[] = [];

    // Retry loop with exponential backoff for transient database errors
    for (let attempt = 1; attempt <= this.config.MAX_RETRIES; attempt++) {
      let session: mongoose.ClientSession | null = null;

      try {
        const batchStart = Date.now();

        // Initialize database transaction
        session = await mongoose.startSession();
        session.startTransaction();

        // Step 1: Extract and organize bets for processing
        const { batch: extractedBatch, groupedUserBets } =
          this.extractAndGroupBets();
        batch = extractedBatch;

        // Step 2: Fetch account balances for all users in this batch
        const userAccountBalances = await User.find(
          {
            userId: { $in: Array.from(groupedUserBets.keys()) },
            accountStatus: AccountStatus.ACTIVE,
          },
          { accountBalance: 1, userId: 1 },
          { session }
        ).lean();

        // Handle case where no valid users are found
        if (userAccountBalances.length === 0) {
          console.warn(
            "[BettingManager] No active user accounts found for batch."
          );
          await session.abortTransaction();

          // Mark all bets as failed due to inactive accounts
          const allFailedBets: FailedBetInfo[] = batch.map((bet) => ({
            socket: bet.socket,
            storeId: bet.payload.storeId,
            reason: "Account not found or inactive",
          }));
          this.notifyFailedBets(allFailedBets);
          break;
        }

        // Step 3: Validate bets against user balances and prepare database operations
        const { validatedBets, failedBets, balanceUpdateOps } =
          this.validateBetsAndPrepareOperations({
            groupedUserBets,
            userAccountBalances,
          });

        // Handle case where all bets failed validation
        if (balanceUpdateOps.length === 0) {
          console.warn("[BettingManager] All bets in batch failed validation.");
          await session.abortTransaction();
          this.notifyFailedBets(failedBets);
          break;
        }

        // Step 4: Execute all database operations within the transaction
        await this.executeDatabaseOperations({
          balanceUpdateOps,
          validatedBets,
          session,
        });

        // Step 5: Commit the transaction to make all changes permanent
        await session.commitTransaction();

        // Step 6: Notify clients of successful and failed bets
        this.notifySuccessfulBets(validatedBets);
        this.notifyFailedBets(failedBets);

        // Step 7: Log performance metrics for monitoring
        this.logBatchTiming({
          batchStart,
          batchSize: batch.length,
          successfulBetsCounts: validatedBets.length,
          failedBetsCounts: failedBets.length,
        });

        // Step 8: Notify other system components of accepted bets
        // This enables features like cashingout,auto-cashout tracking and live bet monitoring
        eventBus.emit(EVENT_NAMES.ACCEPTED_BETS, validatedBets);

        break; // Success - exit retry loop
      } catch (error) {
        console.error(
          `[BettingManager] Batch processing failed on attempt ${attempt}:`,
          error
        );

        // Rollback transaction on any error
        if (session) {
          try {
            await session.abortTransaction();
          } catch (abortError) {
            console.error(
              "[BettingManager] Failed to abort transaction:",
              abortError
            );
          }
        }

        // Check if this is a retryable WriteConflict error (MongoDB optimistic locking)
        const isWriteConflict =
          error instanceof MongoError && error.code === 112;

        if (isWriteConflict && attempt < this.config.MAX_RETRIES) {
          const backoffTime = this.config.BASE_BACKOFF_MS * attempt;
          console.log(
            `[BettingManager] WriteConflict detected, retrying in ${backoffTime}ms...`
          );

          await new Promise((resolve) => setTimeout(resolve, backoffTime));
          continue; // Retry the operation
        }

        // Non-retryable error or max retries reached - notify all users of failure
        console.error(
          "[BettingManager] Batch processing failed permanently, notifying all users."
        );
        batch.forEach((bet) => {
          if (bet.socket) {
            bet.socket.emit(
              SOCKET_EVENTS.EMITTERS.BETTING.PLACE_BET_ERROR(
                bet.payload.storeId
              ),
              { message: "An unexpected error occurred." }
            );
          }
        });

        break; // Exit retry loop
      } finally {
        // End session
        if (session) {
          try {
            await session.endSession();
          } catch (sessionError) {
            console.error(
              "[BettingManager] Failed to end database session:",
              sessionError
            );
          }
        }
      }
    }

    // Reset processing flag and schedule next batch if more bets are waiting
    this.isProcessing = false;
    this.scheduleNextBatch();
  }

  /**
   * Extracts bets from the staging area and organizes them by user for efficient processing.
   *
   * This method implements a critical optimization by grouping user bets together, which enables:
   * - Single balance query per user instead of per bet
   * - Atomic validation of all bets for a user
   * - Efficient bulk database operations
   *
   * ## Processing Steps:
   * 1. **Batch Extraction**: Takes up to MAX_BATCH_SIZE bets from staging
   * 2. **Cleanup**: Removes extracted bets from staging to prevent reprocessing
   * 3. **User Grouping**: Organizes bets by userId with calculated total stakes
   * 4. **Data Structure Creation**: Returns optimized data structures for validation
   *
   * ## Memory Management:
   * - Processed bets are immediately removed from staging to free memory
   * - User bet tracking is maintained separately for limit enforcement
   *
   * @returns Object containing the extracted batch array and user-grouped bet data
   */
  private extractAndGroupBets(): {
    batch: StagedBet[];
    groupedUserBets: Map<string, GroupedUserBets>;
  } {
    // Extract a batch of bets limited by configuration
    const batch: StagedBet[] = Array.from(this.stagedBets.values()).slice(
      0,
      this.config.MAX_BATCH_SIZE
    );

    // Remove processed bets from staging to prevent reprocessing
    batch.forEach(({ payload }) => {
      this.stagedBets.delete(payload.betId);
    });

    // Group bets by user for efficient balance validation and processing
    const groupedUserBets: Map<string, GroupedUserBets> = new Map(); // key: userId

    batch.forEach((stagedBet) => {
      const userId = stagedBet.payload.userId;
      const existingGroup = groupedUserBets.get(userId);

      if (existingGroup) {
        // Add to existing user group
        existingGroup.bets.push(stagedBet);
        existingGroup.totalStake += stagedBet.payload.stake;
      } else {
        // Create new user group
        groupedUserBets.set(userId, {
          bets: [stagedBet],
          totalStake: stagedBet.payload.stake,
        });
      }
    });

    return { batch, groupedUserBets };
  }

  /**
   * Validates all bets against user account balances and prepares optimized database operations.
   *
   * This method implements the core business logic for bet acceptance, ensuring that:
   * - Users have sufficient account balance for their total stake
   * - All bets for a user are processed atomically (all succeed or all fail)
   * - Database operations are prepared for efficient bulk execution
   *
   * ## Validation Rules:
   * 1. **Account Status**: Only active accounts can place bets
   * 2. **Balance Sufficiency**: Total stake must not exceed account balance
   * 3. **Atomic Per-User**: If any bet fails for a user, all their bets fail

   *
   * @returns Object containing validated bets, failed bets, and prepared database operations
   */
  private validateBetsAndPrepareOperations(params: ValidateBetsParams): {
    validatedBets: AcceptedBet[];
    failedBets: FailedBetInfo[];
    balanceUpdateOps: AnyBulkWriteOperation[];
  } {
    const { groupedUserBets, userAccountBalances } = params;

    const balanceUpdateOps: AnyBulkWriteOperation[] = [];
    const validatedBets: AcceptedBet[] = [];
    const failedBets: FailedBetInfo[] = [];

    // Create efficient lookup map for O(1) balance queries
    const userAccountBalancesMap = new Map<string, number>(); // Key: userId value: AccountBalance
    userAccountBalances.forEach((account) => {
      userAccountBalancesMap.set(account.userId, account.accountBalance);
    });

    // Process each user's grouped bets
    groupedUserBets.forEach((userGroup, userId) => {
      const userAccountBalance = userAccountBalancesMap.get(userId);

      // Validation 1: User account must exist and be active
      if (userAccountBalance === undefined) {
        userGroup.bets.forEach((bet) => {
          failedBets.push({
            socket: bet.socket,
            storeId: bet.payload.storeId,
            reason: "Account not found or inactive",
          });
        });
        return; // Skip to next user
      }

      // Validation 2: User must have sufficient balance for total stake
      if (userGroup.totalStake > userAccountBalance) {
        userGroup.bets.forEach((bet) => {
          failedBets.push({
            socket: bet.socket,
            storeId: bet.payload.storeId,
            reason: "Insufficient account balance",
          });
        });
        return; // Skip to next user
      }

      // All validations passed - prepare for processing

      // Prepare balance deduction operation
      balanceUpdateOps.push({
        updateOne: {
          filter: { userId },
          update: { $inc: { accountBalance: -userGroup.totalStake } },
        },
      });

      // Calculate new balance for immediate client feedback
      const newAccountBalance = userAccountBalance - userGroup.totalStake;

      // Create accepted bet records with updated balance information
      const userValidatedBets = userGroup.bets.map((bet) => ({
        ...bet,
        newAccountBalance,
      }));

      validatedBets.push(...userValidatedBets);
    });

    return { validatedBets, failedBets, balanceUpdateOps };
  }

  /**
   * Executes all database operations for accepted bets within a single transaction.
   *
   * This method performs the critical data persistence operations that make bets official:
   * 1. **Balance Updates**: Deducts stakes from user accounts using bulk operations
   * 2. **Bet History Creation**: Creates official bet records with PENDING status
   *
   * ## Transaction Safety:
   * - All operations execute within the provided database session
   * - If any operation fails, the entire transaction is rolled back
   * - Ensures data consistency across multiple collections
   *
   * @throws {Error} When currentRoundId is null, indicating a critical system state error
   * @throws {MongoError} When database operations fail
   */
  private async executeDatabaseOperations(
    params: ExecuteDatabaseOperationsParams
  ): Promise<void> {
    const { balanceUpdateOps, validatedBets, session } = params;

    // Critical safety check - we must have a valid round ID to associate bets with
    if (!this.currentRoundId) {
      throw new Error(
        "[BettingManager] CRITICAL ERROR: Attempted to execute database operations without a valid roundId."
      );
    }

    try {
      // Step 1: Apply all user balance deductions in a single bulk operation
      const balanceUpdateResult = await User.bulkWrite(balanceUpdateOps, {
        session,
      });
      // console.info(
      //   `[BettingManager] Balance updates completed: ${balanceUpdateResult.modifiedCount} accounts updated.`
      // );

      // Step 2: Create bet history records for all accepted bets
      const betHistories: BetHistoryI[] = validatedBets.map(({ payload }) => ({
        betId: payload.betId,
        userId: payload.userId,
        stake: payload.stake,
        payout: null, // Will be set when bet is cashed out
        cashoutMultiplier: null, // Will be set when bet is cashed out
        finalMultiplier: null, // Will be set when round ends && didn't cashout
        autoCashoutMultiplier: payload.autoCashoutMultiplier,
        status: BetStatus.PENDING,
        roundId: this.currentRoundId as string,
      }));

      const betHistoryResult = await BetHistory.insertMany(betHistories, {
        session,
      });

      console.info(
        `[BettingManager] ${betHistoryResult.length} bet history records inserted. ${balanceUpdateResult.modifiedCount} account balances updated.`
      );
    } catch (error) {
      console.error("[BettingManager] Database operations failed:", error);
      throw error; // Re-throw to trigger transaction rollback
    }
  }

  /**
   * Sends success notifications to clients whose bets were accepted.
   *
   * Each notification includes:
   * - Unique bet ID for client-side tracking
   * - Updated account balance for immediate UI updates
   * - Store-specific event routing for multi-tenant support
   *
   * ## Client Integration:
   * - Uses WebSocket for immediate notification delivery
   * - Provides structured response data for frontend processing
   * - Includes error handling for disconnected clients
   *
   * @param acceptedBets - Array of successfully processed bets with client socket connections
   *
   * @private
   */
  private notifySuccessfulBets(acceptedBets: AcceptedBet[]): void {
    let notificationsSent = 0;

    acceptedBets.forEach((bet) => {
      try {
        const response = {
          betId: bet.payload.betId,
          accountBalance: bet.newAccountBalance,
          roundId: this.currentRoundId,
          timestamp: new Date().toISOString(),
        };

        if (bet.socket && bet.socket.connected) {
          bet.socket.emit(
            SOCKET_EVENTS.EMITTERS.BETTING.PLACE_BET_SUCCESS(
              bet.payload.storeId
            ),
            response
          );
          notificationsSent++;
        }
      } catch (error) {
        console.error(
          `[BettingManager] Failed to notify client for bet ${bet.payload.betId}:`,
          error
        );
      }
    });
  }

  /**
   * Sends error notifications to clients whose bets were rejected.
   *
   * Each notification includes:
   * - Clear error message explaining the rejection reason
   * - Store-specific event routing
   * - Timestamp for client-side logging
   *
   * ## Error Message Strategy:
   * - User-friendly messages that don't expose internal system details
   * - Actionable information when possible (e.g., "insufficient balance")
   * - Consistent error format across all failure scenarios
   *
   * @param failedBets - Array of rejected bets with client socket connections and failure reasons
   *
   * @private
   */
  private notifyFailedBets(failedBets: FailedBetInfo[]): void {
    if (failedBets.length === 0) return;

    let notificationsSent = 0;

    failedBets.forEach(({ socket, storeId, reason }) => {
      try {
        const response = {
          message: reason,
          timestamp: new Date().toISOString(),
        };

        if (socket && socket.connected) {
          socket.emit(
            SOCKET_EVENTS.EMITTERS.BETTING.PLACE_BET_ERROR(storeId),
            response
          );
          notificationsSent++;
        }
      } catch (error) {
        console.error(
          "[BettingManager] Failed to send error notification:",
          error
        );
      }
    });
  }

  /**
   * Logs comprehensive performance metrics and statistics for batch processing operations.
   *
   * This method provides essential monitoring data for:
   * - Performance analysis and optimization
   * - System capacity planning
   * - Debugging and troubleshooting
   *
   * ## Logged Metrics:
   * - **Processing Duration**: Time taken in milliseconds/seconds
   * - **Throughput**: Total number of bets processed in the batch
   * - **Success Rate**: Count of successfully processed vs failed bets
   * - **Performance Indicators**: Processing rate (bets per second) for batch
   */
  private logBatchTiming(params: BatchLogsParams): void {
    const { batchStart, batchSize, successfulBetsCounts, failedBetsCounts } =
      params;

    const batchEnd = Date.now();
    const durationMs = batchEnd - batchStart;
    const durationSeconds = (durationMs / 1000).toFixed(2);
    const betsPerSecond =
      batchSize > 0 ? (batchSize / (durationMs / 1000)).toFixed(2) : "0";
    const successRate =
      batchSize > 0
        ? ((successfulBetsCounts / batchSize) * 100).toFixed(1)
        : "0";

    console.info(
      `[BettingManager] Batch Complete: ${batchSize} bets processed in ${durationMs}ms (${durationSeconds}s) | ` +
        `Success: ${successfulBetsCounts}, Failed: ${failedBetsCounts} | ` +
        `Rate: ${betsPerSecond} bets/sec | Success Rate: ${successRate}%`
    );

    // Additional performance warnings for monitoring
    if (durationMs > 1000) {
      console.warn(
        `[BettingManager] PERFORMANCE WARNING: Batch processing took ${durationSeconds}s, consider optimizing.`
      );
    }

    if (batchSize > 0 && successfulBetsCounts === 0) {
      console.error(
        `[BettingManager] CRITICAL: All ${batchSize} bets in batch failed processing.`
      );
    }
  }

  /**
   * Checks if a user has reached the maximum allowed concurrent bets.
   *
   * This method implements anti-abuse protection by preventing users from:
   * - Overwhelming the system with excessive bet requests
   */
  private userHasMaxBets(userId: string): boolean {
    const existingBets = this.userIdsToBetIds.get(userId);

    if (!existingBets) {
      return false;
    }

    const hasMaxBets = existingBets.size >= this.config.MAX_BETS_PER_USER;

    return hasMaxBets;
  }

  /**
   * Schedules the next batch processing cycle.
   *
   * This method implements a scheduling strategy that:
   * - **Prevents Immediate Processing**: Allows time for bet accumulation to form efficient batches
   * - **Avoids Concurrent Processing**: Ensures only one batch processes at a time
   * - **Optimizes Throughput**: Balances latency vs batch efficiency
   *
   * ## Debouncing Strategy:
   * When the system is idle, the first bet doesn't get processed immediately. Instead,
   * it waits for DEBOUNCE_TIME_MS to allow a "wave" of bets to accumulate, making
   * the batch processing more efficient and reducing database load.
   */
  private scheduleNextBatch(): void {
    // Only schedule if conditions are met for batch processing
    if (
      !this.isProcessing &&
      !this.debounceTimerId &&
      this.stagedBets.size > 0
    ) {
      this.debounceTimerId = setTimeout(() => {
        this.processBatch().catch((error) => {
          console.error(
            "[BettingManager] Scheduled batch processing failed:",
            error
          );
        });
      }, this.config.DEBOUNCE_TIME_MS);
    }
  }

  /**
   * Opens the betting window to allow new bet submissions for a specific game round.
   *
   * This method marks the beginning of a new betting phase where:
   * - Users can submit new bets through the stageBet method
   * - All bets are associated with the provided round ID
   * - The system is ready to process incoming betting requests
   *
   * ## Usage Context:
   * - Called at the start of each new game round
   * - Must be called before any bets can be accepted
   * - Should be paired with closeBettingWindow when the round begins
   *
   * @param roundId - Unique identifier for the game round that bets will be associated with
   */
  public openBettingWindow(roundId: string): void {
    if (!roundId || typeof roundId !== "string") {
      throw new Error(
        "[BettingManager] Invalid roundId provided to openBettingWindow"
      );
    }

    this.isBettingWindowOpen = true;
    this.currentRoundId = roundId;
  }

  /**
   * Closes the betting window to prevent new bet submissions.
   *
   * This method marks the end of the betting phase where:
   * - No new bets can be submitted
   * - Any remaining staged bets will still be processed
   * - User bet tracking is cleared for the next round
   *
   * ## Usage Context:
   * - Called when a game round begins and betting should stop
   * - Should be called after openBettingWindow for the same round
   * - Allows time for final batch processing to complete
   */
  public closeBettingWindow(): void {
    this.isBettingWindowOpen = false;

    // Clear user bet tracking to prepare for next round
    this.userIdsToBetIds.clear();

    // Note: We don't clear currentRoundId here as it's needed for processing remaining staged bets
  }

  /**
   * Retrieves comprehensive system state information for monitoring and debugging.
   *
   * ## Use Cases:
   * - System health monitoring dashboards
   * - Performance optimization analysis
   * - Debugging and troubleshooting
   * - Capacity planning and scaling decisions
   */
  public getState(): {
    stagedBetsCount: number;
    activeUsersCount: number;
    isBettingWindowOpen: boolean;
    isProcessing: boolean;
    currentRoundId: string | null;
    config: any;
  } {
    return {
      stagedBetsCount: this.stagedBets.size,
      activeUsersCount: this.userIdsToBetIds.size,
      isBettingWindowOpen: this.isBettingWindowOpen,
      isProcessing: this.isProcessing,
      currentRoundId: this.currentRoundId,
      config: { ...this.config }, // Return copy to prevent external modification
    };
  }

  /**
   * Updates all uncashed bets for a completed game round by marking them as LOST.
   *
   * This method handles the end-of-round cleanup process where:
   * - All bets that haven't been cashed out are marked as lost
   * - Only affects bets with status other than WON
   * - Ensures data consistency for round completion
   *
   * ## Business Logic:
   * - Bets with status WON are already cashed out and should not be changed
   * - Bets with status PENDING or other non-winning states become LOST
   * - This creates a clear audit trail for each round's outcomes
   *
   * ## Database Operations:
   * - Uses bulk update for efficient processing of multiple bets
   * - Filters by roundId and excludes already won bets
   * - Returns operation results for monitoring and verification
   * @returns Promise resolving to MongoDB update operation results
   *
   * @throws {GameError} When the database operation fails or is not acknowledged
   * @throws {Error} When database errors occur during processing
   */
  public async bustUncashedBets({
    roundId,
    finalMultiplier,
    session,
  }: {
    roundId: string;
    finalMultiplier: number;
    session: mongoose.ClientSession;
  }): Promise<mongoose.UpdateWriteOpResult> {
    if (!roundId || typeof roundId !== "string") {
      throw new Error(
        `[BettingManager] Invalid roundId provided to bustUncashedBets. RoundId:${roundId}`
      );
    }

    try {
      const results = await BetHistory.updateMany(
        {
          roundId,
          status: { $ne: BetStatus.WON },
        },
        // Add final multiplier to busted bets...
        // At this point we are save to reveal the finalMultiplier as the round ended
        {
          $set: {
            status: BetStatus.LOST,
            finalMultiplier,
          },
        },
        { session }
      );

      // Verify the operation was acknowledged by the database
      if (!results.acknowledged) {
        throw new GameError({
          description: "An error occurred on our side. We are working on it",
          internalMessage:
            "Failed to bust uncashed bets - operation not acknowledged",
          httpCode: 500,
          isOperational: false,
        });
      }

      return results;
    } catch (err) {
      throw err;
    }
  }
}

/**
 * Singleton instance of the BettingManager.
 *
 * This exported instance should be used throughout the application to ensure
 * consistent state management and prevent multiple instances from conflicting.
 */
export const bettingManager = BettingManager.getInstance();
