import { Socket } from "socket.io";
import { BetStatus, BettingPayload } from "../../types/bet.types";
import { SOCKET_EVENTS } from "../../config/socketEvents.config";
import { v4 as uuidv4 } from "uuid";
import User from "../../models/user.model";
import mongoose, { AnyBulkWriteOperation } from "mongoose";
import BetHistory from "../../models/betHistory.model";
import { AccountStatus } from "../../types/user.types";

// ===== PROPER TYPING IMPLEMENTATION =====

/**
 * Represents a bet that has been staged for processing but not yet committed to the database
 */
interface StagedBet {
  payload: BettingPayload & { betId: string };
  socket: Socket;
}

/**
 * Optimized successful bet data structure - contains only essential information
 * TODO IMPLEMENTED: Only holds betId, accountBalance, and userId as specified
 */
interface SuccessfulBetResult {
  betId: string;
  userId: string;
  accountBalance: number;
}

/**
 * Optimized failed bet data structure - contains only essential information
 * TODO IMPLEMENTED: Only holds message and userId as specified
 */
interface FailedBetResult {
  userId: string;
  message: string;
  betId?: string; // Optional for client-side tracking
}

/**
 * Socket emission data for successful bet placement
 */
interface BetSuccessEmission {
  message: string;
  betId: string;
  accountBalance: number;
}

/**
 * Socket emission data for failed bet placement
 */
interface BetErrorEmission {
  message: string;
  betId?: string;
  maxBet?: number;
}

/**
 * Enhanced staged bet with calculated new account balance
 */
interface EnhancedStagedBet extends StagedBet {
  newAccountBalance: number;
}

/**
 * Aggregated betting data for a single user, used during batch processing
 * to validate total stakes against account balances efficiently.
 */
interface GroupedUserBets {
  totalStake: number;
  bets: StagedBet[];
  accountBalance: number;
}

/**
 * Result of bet validation and operation preparation
 */
interface ValidationResult {
  successfulBets: EnhancedStagedBet[];
  failedBets: StagedBet[];
  successfulBetsOperations: AnyBulkWriteOperation[];
}

/**
 * Batch extraction result containing organized bet data
 */
interface BatchExtractionResult {
  batch: StagedBet[];
  groupedUserBets: Map<string, GroupedUserBets>;
}

/**
 * User account balance data from database
 */
interface UserAccountBalance {
  _id: mongoose.Types.ObjectId;
  accountBalance: number;
}

/**
 * Configuration interface for BettingManager limits and settings
 */
interface BettingManagerConfig {
  readonly MAX_BETS_PER_USER: number;
  readonly MAX_BATCH_SIZE: number;
  readonly BATCH_PROCESSING_INTERVAL: number;
}

/**
 * BettingManager handles high-volume bet processing using a staged approach with batch processing.
 *
 * ## Architecture Overview:
 * 1. **Staging Phase**: Incoming bets are validated and temporarily stored in memory
 * 2. **Batch Processing**: Staged bets are processed in batches using database transactions
 * 3. **Client Notification**: Results are communicated back to clients via WebSocket
 *
 * ## Key Features:
 * - **High Throughput**: Handles optimized database operations
 * - **Transaction Safety**: Uses MongoDB transactions to ensure data consistency
 * - **Real-time Communication**: WebSocket integration for immediate client feedback
 * - **Resource Management**: Configurable limits to prevent system overload
 * - **Automatic Processing**: Continuous batch processing with fallback mechanisms
 * - **Proper Typing**: Fully typed with TypeScript for better development experience
 *
 * ## Performance Considerations:
 * - Batch processing reduces database round trips
 * - Bulk operations minimize transaction overhead
 * - In-memory staging provides fast bet acceptance
 * - User grouping enables efficient balance validation
 * - Optimized data structures minimize memory usage
 *
 * @example
 * ```typescript
 * const bettingManager = BettingManager.getInstance();
 *
 * // Open betting window
 * bettingManager.openBettingWindow();
 *
 * // Stage a bet
 * bettingManager.stageBet({
 *   userId: "user123",
 *   stake: 100,
 *   autoCashoutMultiplier: 2.0
 * }, socket);
 *
 * // Close betting window
 * bettingManager.closeBettingWindow();
 * ```
 */
class BettingManager {
  private static instance: BettingManager;

  /** Configuration object with all limits and settings */
  private readonly config: BettingManagerConfig = {
    MAX_BETS_PER_USER: 2,
    MAX_BATCH_SIZE: 500,
    BATCH_PROCESSING_INTERVAL: 1000, // 1 second
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

  // Processing control flags
  /** Prevents concurrent batch processing to avoid race conditions and multiple batch processing */
  private isProcessing: boolean = false;

  /** Controls whether new bets can be accepted - typically closed during game rounds */
  private isBettingWindowOpen: boolean = false;

  /** Interval ID for batch processing fallback mechanism */
  private batchProcessingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    console.log("[BettingManager] Initialized with config:", this.config);
    this.initializeBatchProcessing();
  }

  /**
   * Initialize the batch processing fallback mechanism
   */
  private initializeBatchProcessing(): void {
    // Fallback mechanism: Process batches every second to ensure no bets are stuck
    // This acts as a safety net if the primary setImmediate triggers fail
    this.batchProcessingInterval = setInterval(() => {
      console.log("[BettingManager] setInterval trigger processBatch");
      this.processBatch().catch((error) => {
        console.error(
          "[BettingManager] Error in interval batch processing:",
          error
        );
      });
    }, this.config.BATCH_PROCESSING_INTERVAL);
  }

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
  public stageBet(params: BettingPayload, socket: Socket): void {
    console.log("[stageBet] Attempting to stage bet", params);

    // Validation 1: Check if betting is currently allowed
    if (!this.isBettingWindowOpen) {
      console.log("[stageBet] Betting window is closed, rejecting bet");
      const errorData: BetErrorEmission = {
        message: "Betting window is closed",
      };
      socket.emit(SOCKET_EVENTS.EMITTERS.BETTING.PLACE_BET_ERROR, errorData);
      return;
    }

    // Validation 2: Check if user has reached maximum concurrent bets
    if (this.userHasMaxBets(params.userId)) {
      console.log("[stageBet] User has reached max bets, rejecting bet");
      const errorData: BetErrorEmission = {
        message: "Max bet reached",
        maxBet: this.config.MAX_BETS_PER_USER,
      };
      socket.emit(SOCKET_EVENTS.EMITTERS.BETTING.PLACE_BET_ERROR, errorData);
      return;
    }

    // Generate unique identifier for this bet
    const betId: string = uuidv4();
    console.log("[stageBet] Generated betId", betId);

    // Update user-to-bet mapping for tracking and validation
    const userBetIds: Set<string> =
      this.userIdsToBetIds.get(params.userId) || new Set();
    userBetIds.add(betId);
    this.userIdsToBetIds.set(params.userId, userBetIds);

    const betToStage: StagedBet = {
      payload: { ...params, betId },
      socket,
    };

    // Store bet in staging area
    this.stagedBetsMap.set(betId, betToStage);

    console.log(
      `[stageBet] Bet staged successfully for user ${params.userId}. Total staged bets: ${this.stagedBetsMap.size}`
    );

    // Trigger immediate batch processing to minimize latency
    this.processBatch().catch((error) => {
      console.error("[stageBet] Error triggering batch processing:", error);
    });
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
   * ## Transaction Safety:
   * - Uses MongoDB sessions with explicit transactions
   * - Automatic rollback on any failure
   * - Ensures atomicity of balance updates and bet creation
   *
   * ## Performance Optimizations:
   * - Bulk database operations reduce round trips
   * - User grouping minimizes balance queries
   * - Batch size limits prevent memory issues
   *
   * @returns Promise<Array> of successfully processed bet IDs
   */
  public async processBatch(): Promise<string[]> {
    console.log("[processBatch] Called");

    // Guard clause: Prevent concurrent processing
    if (this.isProcessing) {
      console.log("[processBatch] Already processing, skipping");
      return [];
    }

    // Guard clause: No bets to process
    if (this.stagedBetsMap.size === 0) {
      console.log("[processBatch] No bets to process, skipping");
      return [];
    }

    // Guard clause: Betting window must be open for processing
    if (!this.isBettingWindowOpen) {
      console.log(
        "[processBatch] Betting window is closed, skipping batch processing"
      );
      return [];
    }

    // Set processing flag to prevent concurrent execution
    this.isProcessing = true;
    const batchStart: number = Date.now();
    console.log(
      `[processBatch] Started processing batch at ${new Date(
        batchStart
      ).toISOString()}`
    );

    // Initialize database transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Step 1: Extract and organize bets for processing
      const { batch, groupedUserBets }: BatchExtractionResult =
        this.extractAndGroupBets();

      // Step 2: Fetch current account balances for all users in this batch
      const userAccountBalances: UserAccountBalance[] = await User.find(
        {
          _id: { $in: Array.from(groupedUserBets.keys()) },
          accountStatus: AccountStatus.ACTIVE,
        },
        { accountBalance: 1, _id: 1 }
      ).session(session);

      console.log(
        `[processBatch] Fetched account balances for ${userAccountBalances.length} users`
      );

      // Handle edge case: No users found (possibly deleted accounts)
      if (userAccountBalances.length === 0) {
        console.log("[processBatch] No user account balances found, aborting");
        await session.abortTransaction();
        session.endSession();
        this.isProcessing = false;
        return [];
      }

      // Step 3: Validate bets against account balances and prepare database operations
      const {
        successfulBets,
        failedBets,
        successfulBetsOperations,
      }: ValidationResult = this.validateBetsAndPrepareOperations(
        groupedUserBets,
        userAccountBalances
      );

      // Handle case where all bets fail due to insufficient funds
      if (successfulBetsOperations.length === 0) {
        console.log(
          "[processBatch] No successful bets, all bets failed due to insufficient balance."
        );
        this.notifyFailedBets(failedBets, "Insufficient balance");
        await session.abortTransaction();
        session.endSession();
        this.isProcessing = false;
        return [];
      }

      // Step 4: Execute all database operations atomically
      await this.executeDatabaseOperations(
        successfulBetsOperations,
        successfulBets,
        session
      );

      // Commit transaction - all operations succeed or fail together
      await session.commitTransaction();
      session.endSession();
      console.log(`[processBatch] Batch committed successfully.`);

      // Step 5: Notify clients of results (outside transaction for performance)
      this.notifyBetResults(successfulBets, failedBets);

      // Step 6: Log performance metrics for monitoring
      this.logBatchTiming(
        batchStart,
        batch.length,
        successfulBets.length,
        failedBets.length
      );

      return successfulBets.map(
        ({ payload }: EnhancedStagedBet): string => payload.betId
      );
    } catch (error) {
      // Handle any processing errors by rolling back transaction
      console.error("[processBatch] Error processing batch:", error);
      await session.abortTransaction();
      session.endSession();
      return [];
    } finally {
      // Always reset processing flag and schedule next processing cycle
      this.isProcessing = false;
      console.log(
        "[processBatch] Finished processing, resetting isProcessing flag"
      );

      // Schedule immediate next processing cycle to handle any new staged bets
      setImmediate(() => {
        this.processBatch().catch((error) => {
          console.error(
            "[processBatch] Error in setImmediate batch processing:",
            error
          );
        });
      });
    }
  }

  /**
   * Extracts bets from staging area and organizes them by user for efficient processing.
   * This method removes processed bets from staging and creates user-grouped data structures
   * that enable bulk validation and database operations.
   *
   * ## Processing Steps:
   * 1. Extract up to MAX_BATCH_SIZE bets from staging
   * 2. Remove extracted bets from staging maps
   * 3. Group bets by user ID with calculated total stakes
   * 4. Return both individual batch and grouped data
   *
   * ## Data Structures:
   * - `batch`: Array of individual bets for processing
   * - `groupedUserBets`: Map of userId -> aggregated bet data
   *
   * @returns Object containing the extracted batch and user-grouped bet data
   *
   * @private
   */
  private extractAndGroupBets(): BatchExtractionResult {
    // Extract batch limited by MAX_BATCH_SIZE
    const batch: StagedBet[] = Array.from(this.stagedBetsMap.values()).slice(
      0,
      this.config.MAX_BATCH_SIZE
    );

    // Remove processed bets from staging to prevent reprocessing
    batch.forEach(({ payload }: StagedBet): void => {
      this.stagedBetsMap.delete(payload.betId);

      // Clean up user-to-bet mapping
      const userBetIds: Set<string> | undefined = this.userIdsToBetIds.get(
        payload.userId
      );
      if (userBetIds) {
        userBetIds.delete(payload.betId);
        if (userBetIds.size === 0) {
          this.userIdsToBetIds.delete(payload.userId);
        }
      }
    });
    console.log(
      `[extractAndGroupBets] Extracted batch of size ${batch.length}`
    );

    // Group bets by user for efficient balance validation
    const groupedUserBets: Map<string, GroupedUserBets> = new Map();
    batch.forEach((stagedBet: StagedBet): void => {
      const existingGroup: GroupedUserBets | undefined = groupedUserBets.get(
        stagedBet.payload.userId
      );

      if (existingGroup) {
        // Add to existing user group
        existingGroup.bets.push(stagedBet);
        existingGroup.totalStake += stagedBet.payload.stake;
      } else {
        // Create new user group
        groupedUserBets.set(stagedBet.payload.userId, {
          accountBalance: 0, // Will be populated during validation
          bets: [stagedBet],
          totalStake: stagedBet.payload.stake,
        });
      }
    });

    // Log grouping results for monitoring
    console.log(
      "[extractAndGroupBets] Grouped bets by user:",
      Array.from(groupedUserBets.entries()).map(
        ([userId, group]: [string, GroupedUserBets]) => ({
          userId,
          totalStake: group.totalStake,
          betsCount: group.bets.length,
        })
      )
    );

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
   *
   * ## Database Operation Preparation:
   * - Creates bulk write operations for efficient balance updates
   * - Uses MongoDB's $inc operator for atomic balance decrements
   * - Prepares operations only for users with sufficient funds
   *
   * @param groupedUserBets - Map of user IDs to their aggregated bet data
   * @param userAccountBalances - Array of user documents with current account balances
   * @returns Object containing successful bets, failed bets, and prepared database operations
   *
   * @private
   */
  private validateBetsAndPrepareOperations(
    groupedUserBets: Map<string, GroupedUserBets>,
    userAccountBalances: UserAccountBalance[]
  ): ValidationResult {
    const successfulBetsOperations: AnyBulkWriteOperation[] = [];
    const successfulBets: EnhancedStagedBet[] = [];
    const failedBets: StagedBet[] = [];

    // Process each user's balance against their total bet stakes
    userAccountBalances.forEach((user: UserAccountBalance): void => {
      const userId: string = user._id.toString();
      const betDetails: GroupedUserBets | undefined =
        groupedUserBets.get(userId);

      if (betDetails && user.accountBalance >= betDetails.totalStake) {
        // User has sufficient balance - prepare atomic balance update
        successfulBetsOperations.push({
          updateOne: {
            filter: { _id: user._id },
            update: { $inc: { accountBalance: -betDetails.totalStake } },
          },
        });

        // Calculate new account balance after deduction
        const newAccountBalance: number =
          user.accountBalance - betDetails.totalStake;

        // Create enhanced staged bets with new account balance
        const enhancedBets: EnhancedStagedBet[] = betDetails.bets.map(
          (bet: StagedBet): EnhancedStagedBet => ({
            ...bet,
            newAccountBalance,
          })
        );

        // Mark all bets for this user as successful
        successfulBets.push(...enhancedBets);
        console.log(
          `[validateBetsAndPrepareOperations] User ${userId} has sufficient balance (${user.accountBalance}). Marking bets successful.`
        );
      } else if (betDetails) {
        // Insufficient balance - mark all bets for this user as failed
        failedBets.push(...betDetails.bets);
        console.log(
          `[validateBetsAndPrepareOperations] User ${userId} has insufficient balance (${user.accountBalance}). Marking bets failed.`
        );
      }
    });

    return { successfulBets, failedBets, successfulBetsOperations };
  }

  /**
   * Executes all database operations for successful bets within the current transaction.
   * This method performs the critical data persistence operations that make the bets official.
   *
   * ## Database Operations:
   * 1. **Balance Updates**: Apply all user balance deductions using bulk operations
   * 2. **Bet History Creation**: Insert bet records with initial PENDING status
   *
   * ## Transaction Context:
   * - All operations use the provided MongoDB session for atomicity
   * - If any operation fails, the entire transaction will be rolled back
   * - Ensures data consistency between user balances and bet records
   *
   * @param successfulBetsOperations - Prepared bulk write operations for balance updates
   * @param successfulBets - Array of successful bets to create history records for
   * @param session - MongoDB session for transaction context
   *
   * @private
   */
  private async executeDatabaseOperations(
    successfulBetsOperations: AnyBulkWriteOperation[],
    successfulBets: EnhancedStagedBet[],
    session: mongoose.ClientSession
  ): Promise<void> {
    // Step 1: Apply all balance updates atomically
    console.log(
      "[executeDatabaseOperations] Applying bulk updates to user balances"
    );
    await User.bulkWrite(successfulBetsOperations, { session });

    // Step 2: Create bet history records for all successful bets
    const betHistories = successfulBets.map(
      ({ payload }: EnhancedStagedBet) => ({
        betId: payload.betId,
        userId: payload.userId,
        stake: payload.stake,
        payout: null, // Will be set when bet is resolved
        cashoutMultiplier: null, // Will be set if user cashes out early
        finalMultiplier: null, // Will be set when round ends
        autoCashoutMultiplier: payload.autoCashoutMultiplier,
        status: BetStatus.PENDING, // Initial status for new bets
        roundId: "dddd", // TODO: Use actual round ID from game context
      })
    );

    console.log(
      "[executeDatabaseOperations] Inserting bet histories for successful bets"
    );
    await BetHistory.insertMany(betHistories, { session });
  }

  /**
   * Sends notification messages to clients about their bet processing results.
   * This method provides immediate feedback to users via WebSocket connections,
   * informing them whether their bets were accepted or rejected.
   *
   * TODO IMPLEMENTED: Optimized data structures - successful bets now only include
   * betId, accountBalance, and userId. Failed bets only include message and userId.
   *
   * ## Notification Types:
   * - **Success**: Bet accepted and processed successfully with new account balance
   * - **Failure**: Bet rejected due to insufficient balance or other issues
   *
   * ## Client Communication:
   * - Uses socket.emit to send real-time messages
   * - Includes bet IDs for client-side tracking
   * - Provides descriptive error messages for failures
   * - Sends updated account balance for successful bets
   *
   * @param successfulBets - Array of successfully processed bets with new account balances
   * @param failedBets - Array of bets that failed processing
   *
   * @private
   */
  private notifyBetResults(
    successfulBets: EnhancedStagedBet[],
    failedBets: StagedBet[]
  ): void {
    // Notify clients of successful bet placements with optimized data
    successfulBets.forEach(
      ({ socket, payload, newAccountBalance }: EnhancedStagedBet): void => {
        const successData: BetSuccessEmission = {
          message: "Bet placed successfully",
          betId: payload.betId,
          accountBalance: newAccountBalance, // Send updated balance to client
        };
        socket.emit(
          SOCKET_EVENTS.EMITTERS.BETTING.PLACE_BET_SUCCESS,
          successData
        );
      }
    );

    // Notify clients of failed bet placements with minimal data
    failedBets.forEach(({ socket, payload }: StagedBet): void => {
      const errorData: BetErrorEmission = {
        message: "Insufficient Balance",
        betId: payload.betId,
      };
      socket.emit(SOCKET_EVENTS.EMITTERS.BETTING.PLACE_BET_ERROR, errorData);
    });
  }

  /**
   * Sends failure notifications to clients for rejected bets.
   * This helper method handles the common case of notifying clients
   * when their bets cannot be processed.
   *
   * TODO IMPLEMENTED: Uses optimized FailedBetResult structure with minimal data
   *
   * @param failedBets - Array of bets that failed to process
   * @param reason - Human-readable reason for the failure
   *
   * @private
   */
  private notifyFailedBets(failedBets: StagedBet[], reason: string): void {
    failedBets.forEach(({ socket, payload }: StagedBet): void => {
      const errorData: BetErrorEmission = {
        message: reason,
        betId: payload.betId,
      };
      socket.emit(SOCKET_EVENTS.EMITTERS.BETTING.PLACE_BET_ERROR, errorData);
    });
  }

  /**
   * Logs detailed timing and statistics information for batch processing operations.
   * This method provides essential monitoring data for performance analysis and debugging.
   *
   * ## Logged Metrics:
   * - Processing duration in milliseconds and seconds
   * - Total number of bets processed
   * - Success and failure counts
   * - Batch completion timestamp
   *
   * ## Use Cases:
   * - Performance monitoring and optimization
   * - Identifying processing bottlenecks
   * - Debugging batch processing issues
   * - Capacity planning and scaling decisions
   *
   * @param batchStart - Timestamp when batch processing began
   * @param totalBets - Total number of bets in the processed batch
   * @param successful - Number of successfully processed bets
   * @param failed - Number of failed bet processing attempts
   *
   * @private
   */
  private logBatchTiming(
    batchStart: number,
    totalBets: number,
    successful: number,
    failed: number
  ): void {
    const batchEnd: number = Date.now();
    const durationMs: number = batchEnd - batchStart;
    const durationSeconds: string = (durationMs / 1000).toFixed(2);

    console.log(`[Batch] Completed at ${new Date(batchEnd).toISOString()}`);
    console.log(
      `→ Processed ${totalBets} bets in ${durationMs}ms (${durationSeconds}s)`
    );
    console.log(`→ Success: ${successful}, Failed: ${failed}`);
  }

  /**
   * Opens the betting window to allow new bet submissions.
   * When the betting window is open, users can submit new bets through the stageBet method.
   * This is typically called at the start of a new game round.
   *
   * ## State Changes:
   * - Sets isBettingWindowOpen flag to true
   * - Enables bet acceptance in stageBet method
   * - Allows batch processing to continue
   *
   * @example
   * ```typescript
   * // Start of new game round
   * bettingManager.openBettingWindow();
   * ```
   */
  public openBettingWindow(): void {
    this.isBettingWindowOpen = true;
    console.log("[BettingManager] Betting window opened");
  }

  /**
   * Closes the betting window to prevent new bet submissions.
   * When the betting window is closed, new bet requests will be immediately rejected.
   * This is typically called when a game round begins and no more bets should be accepted.
   *
   * ## State Changes:
   * - Sets isBettingWindowOpen flag to false
   * - Prevents new bet acceptance in stageBet method
   * - Stops batch processing of new bets
   *
   * ## Note:
   * Bets that are already staged will still be processed if batch processing is in progress.
   *
   * @example
   * ```typescript
   * // Game round starting, stop accepting bets
   * bettingManager.closeBettingWindow();
   * ```
   */
  public closeBettingWindow(): void {
    this.isBettingWindowOpen = false;
    console.log("[BettingManager] Betting window closed");
  }

  /**
   * Gracefully shuts down the BettingManager by clearing intervals and processing remaining bets
   */
  public async shutdown(): Promise<void> {
    console.log("[BettingManager] Shutting down...");

    // Clear the batch processing interval
    if (this.batchProcessingInterval) {
      clearInterval(this.batchProcessingInterval);
      this.batchProcessingInterval = null;
    }

    // Process any remaining staged bets
    if (this.stagedBetsMap.size > 0) {
      console.log(
        `[BettingManager] Processing ${this.stagedBetsMap.size} remaining bets before shutdown`
      );
      await this.processBatch();
    }

    console.log("[BettingManager] Shutdown complete");
  }

  /**
   * Get current statistics about the betting manager state
   */
  public getStats(): {
    stagedBetsCount: number;
    activeUsersCount: number;
    isBettingWindowOpen: boolean;
    isProcessing: boolean;
    config: BettingManagerConfig;
  } {
    return {
      stagedBetsCount: this.stagedBetsMap.size,
      activeUsersCount: this.userIdsToBetIds.size,
      isBettingWindowOpen: this.isBettingWindowOpen,
      isProcessing: this.isProcessing,
      config: this.config,
    };
  }

  /**
   * Checks if a user has reached the maximum allowed number of concurrent bets.
   * This method implements rate limiting to prevent system abuse and ensure fair resource usage.
   *
   * ## Rate Limiting Logic:
   * - Counts current staged bets for the specified user
   * - Compares against MAX_BETS_PER_USER configuration
   * - Returns true if limit is reached or exceeded
   *
   * ## Use Cases:
   * - Preventing spam or abuse by limiting bet volume per user
   * - Ensuring system resources are fairly distributed
   * - Protecting against potential memory exhaustion attacks
   *
   * @param userId - The user ID to check bet limits for
   * @returns True if user has reached maximum bet limit, false otherwise
   *
   * @private
   */
  private userHasMaxBets(userId: string): boolean {
    const existingBets = this.userIdsToBetIds.get(userId);
    const hasMax = existingBets
      ? existingBets.size >= this.config.MAX_BETS_PER_USER
      : false;

    console.log(
      `[userHasMaxBets] User ${userId} has ${
        existingBets?.size ?? 0
      } bets. Max reached? ${hasMax}`
    );

    return hasMax;
  }
}

export const bettingManager = BettingManager.getInstance();
