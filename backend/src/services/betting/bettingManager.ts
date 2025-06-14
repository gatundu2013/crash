import { Socket } from "socket.io";
import {
  AcceptedBet,
  BetStatus,
  BettingPayload,
  FailedBetInfo,
  GroupedUserBets,
  StagedBet,
  userAccountBalance,
} from "../../types/bet.types";
import { SOCKET_EVENTS } from "../../config/socketEvents.config";
import { v4 as uuidv4 } from "uuid";
import User from "../../models/user.model";
import mongoose, { AnyBulkWriteOperation } from "mongoose";
import BetHistory from "../../models/betHistory.model";
import { AccountStatus } from "../../types/user.types";
import { GameError } from "../../utils/errors/gameError";
import { EVENT_NAMES, eventBus } from "../eventBus";

/**
 * BettingManager handles high-volume bet processing using a staged approach with batch processing.
 * Batch processing reduces database round trips
 *
 * ## Architecture Overview:
 * 1. **Staging Phase**: Incoming bets are validated and temporarily stored in memory
 * 2. **Batch Processing**: Staged bets are processed in batches using database transactions
 * 3. **Client Notification**: Results are communicated back to clients via WebSocket
 */
class BettingManager {
  // No longer extends EventEmitter
  private static instance: BettingManager;

  private readonly config = {
    MAX_BETS_PER_USER: 2,
    MAX_BATCH_SIZE: 500,
    DEBOUNCE_TIME_MS: 200, // Time to wait before processing a batch
  };

  /**
   * Primary storage for staged bets awaiting processing.
   * Key: betId, Value: StagedBet with payload and socket reference
   */
  private readonly stagedBetsMap: Map<string, StagedBet> = new Map();

  /**
   * Index mapping users to their active bet IDs for quick lookup and validation.
   * Key: userId, Value: Set of betIds belonging to that user
   */
  private readonly userIdsToBetIds: Map<string, Set<string>> = new Map();

  /** Prevents concurrent batch processing to avoid race conditions and multiple batch processing */
  private isProcessing: boolean = false;

  /** Controls whether new bets can be accepted - closed during game rounds */
  private isBettingWindowOpen: boolean = false;

  private debounceTimerId: NodeJS.Timeout | null = null;

  private currentRoundId: string | null = null;

  private constructor() {}

  public static getInstance(): BettingManager {
    if (!BettingManager.instance) {
      BettingManager.instance = new BettingManager();
    }
    return BettingManager.instance;
  }

  /**
   * Stages a bet for batch processing after performing initial validation.
   * This is the main entry point for new betting requests.
   */
  public async stageBet(params: BettingPayload, socket: Socket) {
    // Validation 1: Check if betting is currently allowed
    if (!this.isBettingWindowOpen) {
      console.warn("[BettingManager-StageBet]:Betting window is closed");
      socket.emit(
        SOCKET_EVENTS.EMITTERS.BETTING.PLACE_BET_ERROR(params.storeId),
        {
          message: "Betting window is closed",
        }
      );
      return;
    }

    // Validation 2: Check if user has reached maximum concurrent bets
    if (this.userHasMaxBets(params.userId)) {
      console.warn(
        "[BettingManager-StageBet]:User has reached maximum concurrent bets"
      );
      socket.emit(
        SOCKET_EVENTS.EMITTERS.BETTING.PLACE_BET_ERROR(params.storeId),
        {
          message: `Max bet per user is ${this.config.MAX_BETS_PER_USER} bets`,
        }
      );
      return;
    }

    // Generate unique identifier for this bet
    const betId = uuidv4();

    // Update user-to-bet mapping for bet tracking and validation
    const userBetIds = this.userIdsToBetIds.get(params.userId) || new Set();
    userBetIds.add(betId);
    this.userIdsToBetIds.set(params.userId, userBetIds);

    const betToStage: StagedBet = {
      payload: { ...params, betId },
      socket,
    };

    // Store bet in staging area
    this.stagedBetsMap.set(betId, betToStage);

    // This logic starts the batch processing loop using a debounced trigger.
    // It ensures that when the system is idle, the first bet doesn't get
    // processed alone. Instead, it waits X(ms) to allow a "wave" of bets
    // to accumulate, making the first batch more efficient.

    // The condition ensures we only start this timer if:
    // 1. The processing loop is not already running (`!this.isProcessing`).
    // 2. A start-up timer is not already pending (`!this.debounceTimerId`).
    if (!this.isProcessing && !this.debounceTimerId) {
      this.debounceTimerId = setTimeout(() => {
        this.processBatch().catch(console.error);
        this.debounceTimerId = null;
      }, this.config.DEBOUNCE_TIME_MS);
    }
  }

  /**
   * Main batch processing function that handles all staged bets in batches.
   * This is the core of the betting system's high-performance architecture.
   *
   * ## Processing Pipeline:
   * 1. **Pre-processing Validation**: Check processing state and bet availability
   * 2. **Batch Extraction**: Remove bets from staging and group by user
   * 3. **Balance Validation**: Fetch user balances and validate against total stakes
   * 4. **Database Operations**: Execute balance updates and bet history creation
   * 5. **Client Notification**: Send success/failure messages via WebSocket
   * 6. **Cleanup & Scheduling**: Reset flags and schedule next processing cycle
   *
   * @returns Promise<void>
   */
  private async processBatch() {
    // Prevents concurrent processing
    if (this.isProcessing) {
      console.warn(
        "[BettingManager-ProcessBatch]: Another Batch is processing."
      );
      return;
    }

    // No bets to process
    if (this.stagedBetsMap.size === 0) {
      console.warn("[BettingManager-ProcessBatch]: No bets to process.");
      return;
    }

    // Betting window must be open for processing
    if (!this.isBettingWindowOpen) {
      console.warn("[BettingManager-ProcessBatch]: Betting window is closed.");
      return;
    }

    // Set processing flag to prevent concurrent batch execution
    this.isProcessing = true;
    const batchStart: number = Date.now();

    // Initialize database transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Step 1: Extract a batch of bets and group them by user
      const { batch, groupedUserBets } = this.extractAndGroupBets();

      // Step 2: Fetch current account balances for all users in this batch
      const userAccountBalances = await User.find(
        {
          userId: { $in: Array.from(groupedUserBets.keys()) },
          accountStatus: AccountStatus.ACTIVE,
        },
        { accountBalance: 1, userId: 1 },
        { session }
      );

      // No users found
      if (userAccountBalances.length === 0) {
        console.warn("[BettingManager-ProcessBatch]: No users found.");
        await session.abortTransaction();
        session.endSession();
        this.isProcessing = false;
        return;
      }

      // Step 3: Validate bets against balances and prepare database operations
      const { validatedBets, failedBets, balanceUpdateOps } =
        this.validateBetsAndPrepareOperations(
          groupedUserBets,
          userAccountBalances
        );

      // Handle case where all bets fail due to insufficient funds
      if (balanceUpdateOps.length === 0) {
        console.warn(
          "[BettingManager-ProcessBatch]: All user in batch had invalid account or not enough balance"
        );
        await session.abortTransaction();
        session.endSession();
        this.notifyFailedBets(failedBets);
        this.isProcessing = false;
        return;
      }

      // Step 4: Execute all database writes if there are any successful bets
      await this.executeDatabaseOperations(
        balanceUpdateOps,
        validatedBets,
        session
      );

      // Step 5: Commit the transaction
      await session.commitTransaction();

      // Step 6: Notify clients of the results (outside the transaction)
      this.notifyBetResults(validatedBets, failedBets);

      // Step 7: Log batch timing and statistics
      this.logBatchTiming(
        batchStart,
        batch.length,
        validatedBets.length,
        failedBets.length
      );

      // Step 8: Announce the accepted bets to other services.
      // This is a critical step for decoupling. The RoundStateManager listens for
      // this event to update its own state with the new bets, enabling features
      // like auto-cashouts and live bet tracking without being tightly coupled
      // to the BettingManager.
      eventBus.emit(EVENT_NAMES.ACCEPTED_BETS, validatedBets);
    } catch (error) {
      // Rollback transaction on error
      console.error("[processBatch] Error processing batch:", error);
      await session.abortTransaction();
      session.endSession();
      return;
    } finally {
      // Always reset processing flag and schedule next processing cycle
      this.isProcessing = false;

      // Schedule immediate next processing cycle to handle any new staged bets
      setImmediate(() => this.processBatch().catch(console.error));
    }
  }

  /**
   * Extracts and batches bets from staging area and organizes them by user for efficient processing.
   * This method removes processed bets from staging and creates user-grouped data structures
   * that enable bulk validation and database operations.
   *
   * ## Processing Steps:
   * 1. Extract up to MAX_BATCH_SIZE bets from staging
   * 2. Remove extracted bets from staging maps
   * 3. Group bets by user ID with calculated total stakes
   * 4. Return both individual batch and grouped data
   *
   * @returns Object containing the extracted batch and user-grouped bet data
   *
   */
  private extractAndGroupBets() {
    // Extract batch limited by MAX_BATCH_SIZE
    const batch: StagedBet[] = Array.from(this.stagedBetsMap.values()).slice(
      0,
      this.config.MAX_BATCH_SIZE
    );

    // Remove processed bets from staging to prevent reprocessing
    batch.forEach(({ payload }) => {
      this.stagedBetsMap.delete(payload.betId);
    });

    // Group bets by user for efficient balance validation
    const groupedUserBets: Map<string, GroupedUserBets> = new Map(); //userId to betDetails

    batch.forEach((stagedBet: StagedBet): void => {
      const userGroup = groupedUserBets.get(stagedBet.payload.userId);

      if (userGroup) {
        // Add to existing user group
        userGroup.bets.push(stagedBet);
        userGroup.totalStake += stagedBet.payload.stake;
      } else {
        // Create new user group
        groupedUserBets.set(stagedBet.payload.userId, {
          bets: [stagedBet],
          totalStake: stagedBet.payload.stake,
        });
      }
    });

    return { batch, groupedUserBets };
  }

  /**
   * Validates all bets against user account balances and prepares database operations.
   * This method implements the core business logic for determining which bets can be processed
   * based on available funds.
   *
   * ## Validation Logic:
   * - Compare user's account balance against total stake for all their bets
   * - If sufficient: prepare balance deduction operation and mark bets as successful
   * - If insufficient: mark all user's bets as failed (atomic per-user validation)
   */
  private validateBetsAndPrepareOperations(
    groupedUserBets: Map<string, GroupedUserBets>,
    userAccountBalances: userAccountBalance[]
  ) {
    const balanceUpdateOps: AnyBulkWriteOperation[] = [];
    const validatedBets: AcceptedBet[] = [];
    const failedBets: FailedBetInfo[] = [];

    // Step 1: Create a Map for efficient O(1) balance lookups
    const userAccountBalancesMap = new Map<string, number>();
    userAccountBalances.forEach((account) => {
      userAccountBalancesMap.set(account.userId, account.accountBalance);
    });

    // Step 2: Iterate over each user's grouped bets
    groupedUserBets.forEach((user) => {
      const userId = user.bets[0].payload.userId;
      const userAccountBalance = userAccountBalancesMap.get(userId);

      // User not found or account is inactive.
      if (userAccountBalance == undefined) {
        console.warn("[BettingManager] User not found or account is inactive.");
        user.bets.forEach((bet) => {
          failedBets.push({
            socket: bet.socket,
            storeId: bet.payload.storeId,
            reason: "User not found or account is inactive.",
          });
        });
        return;
      }

      // Insufficient balance.
      // User exists but their balance is less than their total stake. Fail all their bets.
      if (userAccountBalance < user.totalStake) {
        console.warn(
          "[BettingManager] User exists but their balance is less than their total stake."
        );
        user.bets.forEach((bet) => {
          failedBets.push({
            socket: bet.socket,
            storeId: bet.payload.storeId,
            reason: "Insufficient balance.",
          });
        });
        return;
      }

      // All validations passed. Process the bet.

      //....User Balance deduction op
      balanceUpdateOps.push({
        updateOne: {
          filter: { userId },
          update: { $inc: { accountBalance: -user.totalStake } },
        },
      });

      // Calculate the new balance to send back to the client for immediate UI update.
      const newAccountBalance = userAccountBalance - user.totalStake;

      // Create the detailed accepted bet records, including the new balance.
      const validatedBetsForCurrentUser = user.bets.map((bet) => {
        return {
          ...bet,
          newAccountBalance,
        };
      });

      // Add the successfully processed bets to the results array.
      validatedBets.push(...validatedBetsForCurrentUser);
    });

    return { validatedBets, failedBets, balanceUpdateOps };
  }

  /**
   * Executes all database operations for successful bets within the current transaction.
   * This method performs the critical data persistence operations that make the bets official.
   *
   * ## Database Operations:
   * 1. **Balance Updates**: Apply all user balance deductions using bulk operations
   * 2. **Bet History Creation**: Insert bet records with initial PENDING status
   */
  private async executeDatabaseOperations(
    balanceUpdateOps: AnyBulkWriteOperation[],
    validatedBets: AcceptedBet[],
    session: mongoose.ClientSession
  ) {
    // This is a critical. If currentRoundId is null, it means we are
    // trying to process bets outside of an active betting window, which should
    // never happen and indicates a severe logic flaw.
    if (!this.currentRoundId) {
      throw new Error(
        "[BettingManager] Fatal Error: Attempted to execute database operations without a valid roundId."
      );
    }

    // Step 1: Apply all balance updates
    await User.bulkWrite(balanceUpdateOps, { session });

    // Step 2: Create bet history records for all successful bets
    const betHistories = validatedBets.map(({ payload }) => ({
      betId: payload.betId,
      userId: payload.userId,
      stake: payload.stake,
      payout: null,
      cashoutMultiplier: null,
      finalMultiplier: null,
      autoCashoutMultiplier: payload.autoCashoutMultiplier,
      status: BetStatus.PENDING,
      roundId: this.currentRoundId, // Use the stored roundId
    }));

    await BetHistory.insertMany(betHistories, { session });
  }

  /**
   * Sends notification messages to clients about their bet processing results.
   * This method provides immediate feedback to users via WebSocket connections,
   * informing them whether their bets were accepted or rejected.
   *
   * ## Notification Types:
   * - **Success**: Bet accepted and processed successfully with new account balance
   * - **Failure**: Bet rejected due to insufficient balance or other issues
   */
  private notifyBetResults(
    validatedBets: AcceptedBet[],
    failedBets: FailedBetInfo[]
  ): void {
    // Notify clients of successful bet placements with optimized data
    validatedBets.forEach((bet) => {
      const successRes = {
        betId: bet.payload.betId,
        accountBalance: bet.newAccountBalance,
      };

      if (bet.socket) {
        bet.socket.emit(
          SOCKET_EVENTS.EMITTERS.BETTING.PLACE_BET_SUCCESS(bet.payload.storeId),
          successRes
        );
      }
    });

    this.notifyFailedBets(failedBets);
  }

  /**
   * Notifies clients about failed bets with a specific reason for each failure.
   *
   * @param failedBets - An array of objects representing failed bets.
   */
  private notifyFailedBets(failedBets: FailedBetInfo[]): void {
    failedBets.forEach(({ socket, storeId, reason }) => {
      const errorRes = {
        message: reason,
      };

      if (socket) {
        socket.emit(
          SOCKET_EVENTS.EMITTERS.BETTING.PLACE_BET_ERROR(storeId),
          errorRes
        );
      }
    });
  }

  /**
   * Logs detailed timing and statistics information for batch processing operations.
   * This method provides essential monitoring data for performance analysis and debugging.
   *
   * ## Logged Metrics:
   * - Processing duration in milliseconds and seconds
   * - Total number of bets processed in the batch
   * - Success and failure counts
   * - Batch completion timestamp
   */
  private logBatchTiming(
    batchStart: number,
    totalBets: number,
    successful: number,
    failed: number
  ): void {
    const batchEnd = Date.now();
    const durationMs = batchEnd - batchStart;
    const durationSeconds = (durationMs / 1000).toFixed(2);

    console.info(
      `[Batch] Processed ${totalBets} bets in ${durationMs}ms (${durationSeconds}s) | Success: ${successful}, Failed: ${failed}`
    );
  }

  /**
   * Checks if a user has reached the maximum allowed number of concurrent bets.
   * This method implements rate limiting to prevent system abuse and ensure fair resource usage.
   *
   * ## Rate Limiting Logic:
   * - Counts current staged bets for the specified user
   * - Compares against MAX_BETS_PER_USER configuration
   * - Returns true if limit is reached or exceeded
   */
  private userHasMaxBets(userId: string): boolean {
    const existingBets = this.userIdsToBetIds.get(userId);

    if (!existingBets) return false;

    return existingBets.size >= this.config.MAX_BETS_PER_USER;
  }

  /**
   * Opens the betting window to allow new bet submissions.
   * When the betting window is open, users can submit new bets through the stageBet method.
   * This is alled at the start of a new game round.
   * Picks roundId.This roundId is used to save betHistories
   */
  public openBettingWindow(roundId: string) {
    this.isBettingWindowOpen = true;
    this.currentRoundId = roundId;
  }

  /**
   * Closes the betting window to prevent new bet submissions.
   * When the betting window is closed, new bet requests will be immediately rejected.
   * This is called when a game round begins and no more bets should be accepted.
   *
   * ## Note:
   * Any bets still in the staging queue are immediately cleared and rejected. This
   * does not affect any batch that was already in the middle of its database
   * transaction when the window closed.
   */
  public closeBettingWindow() {
    this.isBettingWindowOpen = false;
    this.currentRoundId = null; // Clear roundId

    // Any bets remaining in the staging queue are now considered rejected.
    const rejectedStagedBets = Array.from(this.stagedBetsMap.values());

    // Clear the maps to prevent any further processing of these bets.
    this.stagedBetsMap.clear();
    this.userIdsToBetIds.clear();

    // Notify clients that their staged bets were rejected because the window closed.
    rejectedStagedBets.forEach((rejectedBet) => {
      if (rejectedBet.socket) {
        rejectedBet.socket.emit(
          SOCKET_EVENTS.EMITTERS.BETTING.PLACE_BET_ERROR(
            rejectedBet.payload.storeId
          ),
          {
            message: "Too late. Betting window was closed",
          }
        );
      }
    });
  }

  /**
   * Get current statistics about the betting manager state
   */
  public getStats() {
    return {
      stagedBetsCount: this.stagedBetsMap.size,
      activeUsersCount: this.userIdsToBetIds.size,
      isBettingWindowOpen: this.isBettingWindowOpen,
      isProcessing: this.isProcessing,
      config: this.config,
    };
  }

  /**
   * Updates all uncashed (non-winning) bets for a given game round by marking them as LOST.
   *
   * This function finds all bets in the `BetHistory` collection that belong to the specified
   * round and have a status other than WON. It then sets their status to LOST.
   */
  public async bustUncashedBets(roundId: string) {
    try {
      const results = await BetHistory.updateMany(
        { roundId, status: { $ne: BetStatus.WON } },
        {
          $set: {
            status: BetStatus.LOST,
          },
        }
      );

      if (!results.acknowledged) {
        throw new GameError({
          description: "An error occured on our side. We are working on it",
          internalMessage: "Failed to bust uncashed bets",
          httpCode: 500,
          isOperational: false,
        });
      }

      return results;
    } catch (err) {
      console.error("Failed to bust uncashed bets:", err);
      throw err;
    }
  }

  public getIsProcessing() {
    return this.isProcessing;
  }
}

export const bettingManager = BettingManager.getInstance();
