import { Socket } from "socket.io";
import {
  BetStatus,
  CashoutPayload,
  StagedCashout,
  userAccountBalance,
} from "../../types/bet.types";
import { roundStateManager } from "../game/roundStateManager";
import { SOCKET_EVENTS } from "../../config/socketEvents.config";
import { GamePhase } from "../../types/game.types";
import User from "../../models/user.model";
import BetHistory from "../../models/betHistory.model";
import mongoose, { AnyBulkWriteOperation } from "mongoose";
import { EventEmitter } from "events";
import { GameError } from "../../utils/errors/gameError";

/**
 * CashoutManager handles high-volume cashout processing using batch operations.
 * Similar to BettingManager but handles cashout requests instead of new bets.
 */
class CashoutManager extends EventEmitter {
  private static instance: CashoutManager;

  private readonly config = {
    MAX_CASHOUTS_PER_USER: 4,
    MAX_BATCH_SIZE: 10,
    BATCH_PROCESSING_INTERVAL: 500, // 500ms - faster for cashouts
  };

  /**
   * Storage for staged cashouts awaiting processing.
   * Key: betId, Value: StagedCashout with all necessary data
   */
  private stagedCashouts: Map<string, StagedCashout> = new Map();

  /** Prevents concurrent batch processing */
  private isProcessing = false;

  /** Interval for batch processing fallback */
  private batchProcessingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
  }

  public static getInstance(): CashoutManager {
    if (!CashoutManager.instance) {
      CashoutManager.instance = new CashoutManager();
    }
    return CashoutManager.instance;
  }

  /**
   * Stages a cashout request after validation
   */
  public stageCashout(params: CashoutPayload, socket: Socket): void {
    const roundState = roundStateManager.getState();
    const cashoutMultiplier = roundState.currentMultiplier; //snapShot currentMultiplier

    // Validation 1: Game must be running
    if (roundState.gamePhase !== GamePhase.RUNNING) {
      socket.emit(SOCKET_EVENTS.EMITTERS.BETTING.CASHOUT_ERROR, {
        message: "Too late, game crashed",
      });
      return;
    }

    // Validation 2: Bet must exist
    const activeBet = roundState.betsMap.get(params.betId);
    if (!activeBet) {
      socket.emit(SOCKET_EVENTS.EMITTERS.BETTING.CASHOUT_ERROR, {
        message: "Bet not found",
      });
      return;
    }

    // Validation 3: Bet must not be already settled
    if (activeBet.bet.status === BetStatus.WON) {
      socket.emit(SOCKET_EVENTS.EMITTERS.BETTING.CASHOUT_ERROR, {
        message: "Bet already settled",
      });
      return;
    }

    // Validation 4: Check if already staged
    if (this.stagedCashouts.has(params.betId)) {
      socket.emit(SOCKET_EVENTS.EMITTERS.BETTING.CASHOUT_ERROR, {
        message: "Cashout already in progress",
      });
      return;
    }

    // Stage the cashout with all necessary data
    this.stagedCashouts.set(params.betId, {
      betId: params.betId,
      userId: activeBet.bet.userId,
      stake: activeBet.bet.stake,
      cashoutMultiplier,
      payout: cashoutMultiplier * activeBet.bet.stake, //payout for the bet
      socket,
    });

    // Trigger immediate processing
    this.processBatch().catch(console.error);
  }

  /**
   * Main batch processing function for cashouts
   */
  public async processBatch(): Promise<string[]> {
    if (this.isProcessing || this.stagedCashouts.size === 0) {
      return [];
    }

    this.isProcessing = true;
    const batchStart = Date.now();

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Step 1: Extract batch and group by user
      const { batch, groupedUserCashouts } = this.extractAndGroupCashouts();

      // Step 2: Fetch user account balances (for validation/auditing)
      const userIds = Array.from(groupedUserCashouts.keys());
      const userAccountBalances = await User.find(
        { _id: { $in: userIds } },
        { accountBalance: 1, _id: 1 }
      ).session(session);

      if (userAccountBalances.length === 0) {
        await session.abortTransaction();
        session.endSession();
        this.isProcessing = false;
        return [];
      }

      // Step 3: Prepare database operations
      const { successfulCashouts, failedCashouts, dbOperations } =
        this.prepareCashoutOperations(groupedUserCashouts, userAccountBalances);

      if (dbOperations.length === 0) {
        this.notifyFailedCashouts(failedCashouts, "No valid cashouts");
        await session.abortTransaction();
        session.endSession();
        this.isProcessing = false;
        return [];
      }

      // Step 4: Execute database operations
      await this.executeCashoutOperations(dbOperations, session);

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      // Step 5: Notify clients and update game state
      this.notifyCashoutResults(successfulCashouts, failedCashouts);
      this.updateRoundState(successfulCashouts);

      // Step 6: Log performance
      this.logBatchTiming(
        batchStart,
        batch.length,
        successfulCashouts.length,
        failedCashouts.length
      );

      this.emit("cashoutsProcessed", successfulCashouts);

      return successfulCashouts.map((cashout) => cashout.betId);
    } catch (error) {
      console.error("[CashoutManager] Error processing batch:", error);
      await session.abortTransaction();
      session.endSession();
      return [];
    } finally {
      this.isProcessing = false;
      // Schedule next processing cycle
      setImmediate(() => this.processBatch().catch(console.error));
    }
  }

  /**
   * Extract cashouts from staging and group by user
   */
  private extractAndGroupCashouts() {
    const batch = Array.from(this.stagedCashouts.values()).slice(
      0,
      this.config.MAX_BATCH_SIZE
    );

    // Remove from staging
    batch.forEach((cashout) => {
      this.stagedCashouts.delete(cashout.betId);
    });

    // Group by user
    const groupedUserCashouts = new Map<
      string,
      {
        cashouts: StagedCashout[];
        totalPayout: number;
      }
    >();

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
   * Prepare database operations for cashouts
   */
  private prepareCashoutOperations(
    groupedUserCashouts: Map<
      string,
      { cashouts: StagedCashout[]; totalPayout: number }
    >,
    userAccountBalances: userAccountBalance[]
  ) {
    const dbOperations: AnyBulkWriteOperation[] = [];
    const successfulCashouts: (StagedCashout & {
      newAccountBalance: number;
    })[] = [];
    const failedCashouts: StagedCashout[] = [];

    userAccountBalances.forEach((user) => {
      const userId = user._id.toString();
      const cashoutDetails = groupedUserCashouts.get(userId);

      if (cashoutDetails) {
        // Prepare balance update (add cashout amount)
        dbOperations.push({
          updateOne: {
            filter: { _id: user._id },
            update: { $inc: { accountBalance: cashoutDetails.totalPayout } },
          },
        });

        // Prepare bet history updates
        cashoutDetails.cashouts.forEach((cashout) => {
          dbOperations.push({
            updateOne: {
              filter: { betId: cashout.betId, status: BetStatus.PENDING },
              update: {
                $set: {
                  status: BetStatus.WON,
                  payout: cashout.payout,
                  cashoutMultiplier: cashout.cashoutMultiplier,
                },
              },
            },
          });
        });

        // Calculate new balance for notifications
        let runningBalance = user.accountBalance;
        const enhancedCashouts = cashoutDetails.cashouts.map((cashout) => {
          runningBalance += cashout.payout;
          return {
            ...cashout,
            newAccountBalance: runningBalance,
          };
        });

        successfulCashouts.push(...enhancedCashouts);
      }
    });

    return { successfulCashouts, failedCashouts, dbOperations };
  }

  /**
   * Execute database operations
   */
  private async executeCashoutOperations(
    dbOperations: AnyBulkWriteOperation[],
    session: mongoose.ClientSession
  ): Promise<void> {
    // Execute user balance updates
    const userUpdates = dbOperations.filter(
      (op) => "updateOne" in op && op.updateOne.update.$inc
    );

    if (userUpdates.length > 0) {
      await User.bulkWrite(userUpdates, { session });
    }

    // Execute bet history updates
    const betUpdates = dbOperations.filter(
      (op) => "updateOne" in op && op.updateOne.update.$set
    );
    if (betUpdates.length > 0) {
      await BetHistory.bulkWrite(betUpdates, { session });
    }
  }

  /**
   * Notify clients of cashout results
   */
  private notifyCashoutResults(
    successfulCashouts: (StagedCashout & { newAccountBalance: number })[],
    failedCashouts: StagedCashout[]
  ): void {
    successfulCashouts.forEach((cashout) => {
      if (cashout.socket) {
        cashout.socket.emit(SOCKET_EVENTS.EMITTERS.BETTING.CASHOUT_SUCCESS, {
          message: "Cashout successful",
          betId: cashout.betId,
          payout: cashout.payout,
          multiplier: cashout.cashoutMultiplier,
          accountBalance: cashout.newAccountBalance,
        });
      }
    });

    this.notifyFailedCashouts(failedCashouts, "Cashout failed");
  }

  /**
   * Notify failed cashouts
   */
  private notifyFailedCashouts(
    failedCashouts: StagedCashout[],
    reason: string
  ): void {
    failedCashouts.forEach((cashout) => {
      if (cashout.socket) {
        cashout.socket.emit(SOCKET_EVENTS.EMITTERS.BETTING.CASHOUT_ERROR, {
          message: reason,
          betId: cashout.betId,
        });
      }
    });
  }

  /**
   * Update round state to mark bets as cashed out
   */
  private updateRoundState(successfulCashouts: StagedCashout[]): void {
    const roundState = roundStateManager.getState();

    successfulCashouts.forEach((cashout) => {
      const bet = roundState.betsMap.get(cashout.betId);
      if (bet) {
        bet.bet.status = BetStatus.WON;
        bet.bet.payout = cashout.payout;
        bet.bet.cashoutMultiplier = cashout.cashoutMultiplier;
      }
    });
  }

  /**
   * Start batch processing with interval
   */
  public startProcessing(): void {
    if (this.batchProcessingInterval) {
      clearInterval(this.batchProcessingInterval);
    }

    this.batchProcessingInterval = setInterval(
      () => this.processBatch().catch(console.error),
      this.config.BATCH_PROCESSING_INTERVAL
    );
  }

  /**
   * Stop batch processing
   */
  public stopProcessing(): void {
    if (this.batchProcessingInterval) {
      clearInterval(this.batchProcessingInterval);
      this.batchProcessingInterval = null;
    }
  }

  /**
   * Clear all staged cashouts (when game ends)
   */
  public clearStagedCashouts(reason = "Game ended"): void {
    const stagedCashouts = Array.from(this.stagedCashouts.values());
    this.stagedCashouts.clear();

    this.notifyFailedCashouts(stagedCashouts, reason);
  }

  /**
   * Log batch performance
   */
  private logBatchTiming(
    batchStart: number,
    totalCashouts: number,
    successful: number,
    failed: number
  ): void {
    const durationMs = Date.now() - batchStart;
    const durationSeconds = (durationMs / 1000).toFixed(2);

    console.log(
      `[CashoutBatch] Processed ${totalCashouts} cashouts in ${durationMs}ms (${durationSeconds}s) | Success: ${successful}, Failed: ${failed}`
    );
  }

  /**
   * Get current statistics
   */
  public getState() {
    return {
      stagedCashoutsSize: this.stagedCashouts.size,
      isProcessing: this.isProcessing,
      config: this.config,
    };
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    this.stopProcessing();

    if (this.stagedCashouts.size > 0) {
      await this.processBatch();
    }
  }
}

export const cashoutManager = CashoutManager.getInstance();
