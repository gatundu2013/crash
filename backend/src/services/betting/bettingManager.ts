// Betting Manager: Handles staged betting, batch processing, and transactional updates with metrics

import { Socket } from "socket.io";
import { BetStatus, BettingPayload } from "../../types/bet.types";
import { SOCKET_EVENTS } from "../../config/socketEvents.config";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import User from "../../models/user.model";
import BetHistory from "../../models/betHistory.model";
import { AccountStatus } from "../../types/user.types";

// Each staged bet holds the betting payload, the socket connection, and a unique bet ID
interface StagedBet {
  payload: BettingPayload;
  socket: Socket;
  betId: string;
}

// Organize multiple bets by the same user
// to allow tracking total stake and available balance before updating
type UserBetGroup = {
  totalStake: number;
  bets: StagedBet[];
  originalBalance: number;
};

class BettingManager {
  private static instance: BettingManager;
  private readonly MAX_BETS_PER_USER = 10000;
  private readonly BATCH_SIZE = 1000;
  private readonly BATCH_INTERVAL = 2000;
  private readonly MAX_BATCH_WAIT_TIME = 4000;

  private stagedBets: Map<string, StagedBet> = new Map();
  private userIdToBetIdsMap: Map<string, Set<string>> = new Map();
  private betIdToSocketMap: Map<string, Socket> = new Map();

  private batchTimer: NodeJS.Timeout | null = null;
  private lastBatchTime = 0;
  private isProcessing = false;
  private bettingWindowOpen = false;

  private constructor() {
    this.startContinuousProcessing();
  }

  // Return singleton instance for shared global usage
  public static getInstance(): BettingManager {
    if (!BettingManager.instance) {
      BettingManager.instance = new BettingManager();
    }
    return BettingManager.instance;
  }

  // Enable staging of new bets
  public openBettingWindow(): void {
    this.bettingWindowOpen = true;
    this.lastBatchTime = Date.now();
    console.log(
      "[BettingManager] Betting window opened - continuous processing started"
    );
  }

  // Finalize any outstanding bets and close betting
  public async closeBettingWindow(): Promise<void> {
    this.bettingWindowOpen = false;
    console.log(
      "[BettingManager] Betting window closed - processing final batch"
    );
    if (this.stagedBets.size > 0) {
      await this.processBatch();
    }
  }

  // Accept a new bet and stage it for future batch processing
  public stageBet(bettingPayload: BettingPayload, socket: Socket): void {
    if (!this.bettingWindowOpen) {
      socket.emit(SOCKET_EVENTS.EMITTERS.BETTING.PLACE_BET_ERROR, {
        message: "Betting window is closed",
        userId: bettingPayload.userId,
      });
      return;
    }

    const { userId, stake } = bettingPayload;
    if (!this.canPlaceBet(userId)) {
      socket.emit(SOCKET_EVENTS.EMITTERS.BETTING.PLACE_BET_ERROR, {
        message: "Max bet limit reached",
        maxBets: this.MAX_BETS_PER_USER,
        userId,
      });
      return;
    }

    const betId = uuidv4();
    this.betIdToSocketMap.set(betId, socket);

    const stagedBet: StagedBet = { payload: bettingPayload, socket, betId };
    this.stagedBets.set(betId, stagedBet);

    if (this.userIdToBetIdsMap.has(userId)) {
      this.userIdToBetIdsMap.get(userId)!.add(betId);
    } else {
      this.userIdToBetIdsMap.set(userId, new Set([betId]));
    }

    socket.emit("dd", {
      betId,
      userId,
      stake,
      message: "Bet staged - processing soon",
    });

    this.checkBatchTriggers();
  }

  // Evaluate if a batch should be executed now due to size or timing constraints
  private checkBatchTriggers(): void {
    if (this.isProcessing || !this.bettingWindowOpen) return;

    const now = Date.now();
    const timeSinceLastBatch = now - this.lastBatchTime;
    const shouldProcessBySize = this.stagedBets.size >= this.BATCH_SIZE;
    const shouldProcessByTime = timeSinceLastBatch >= this.MAX_BATCH_WAIT_TIME;

    if (shouldProcessBySize || shouldProcessByTime) {
      this.processBatch();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(
        () => this.processBatch(),
        this.BATCH_INTERVAL
      );
    }
  }

  // Keep polling periodically to see if processing is due
  private startContinuousProcessing(): void {
    setInterval(() => {
      if (
        this.bettingWindowOpen &&
        !this.isProcessing &&
        this.stagedBets.size > 0 &&
        Date.now() - this.lastBatchTime >= this.BATCH_INTERVAL
      ) {
        this.processBatch();
      }
    }, 1000);
  }

  // Main method to process all bets that are staged, deduct balances, and update database
  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.stagedBets.size === 0) return;

    const start = Date.now();
    this.isProcessing = true;
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      // Extract up to BATCH_SIZE number of bets to be processed
      const betsToProcess = new Map<string, StagedBet>();
      const betIds = Array.from(this.stagedBets.keys()).slice(
        0,
        this.BATCH_SIZE
      );

      betIds.forEach((betId) => {
        const bet = this.stagedBets.get(betId);
        if (bet) betsToProcess.set(betId, bet);
      });

      if (betsToProcess.size === 0) return;

      console.log(
        `[BettingManager] Processing batch of ${betsToProcess.size} bets`
      );

      await this.processBetsInTransaction(betsToProcess);

      // Remove all processed bets from in-memory storage
      betsToProcess.forEach((_, betId) => {
        const userId = this.stagedBets.get(betId)?.payload.userId;
        this.stagedBets.delete(betId);
        this.betIdToSocketMap.delete(betId);
        const userBets = userId ? this.userIdToBetIdsMap.get(userId) : null;
        if (userBets) {
          userBets.delete(betId);
          if (userBets.size === 0) this.userIdToBetIdsMap.delete(userId!);
        }
      });

      this.lastBatchTime = Date.now();

      const duration = (Date.now() - start) / 1000; // Calculate how long the batch took
      console.log(
        `[BettingManager] Batch processed in ${duration.toFixed(2)} seconds`
      );
    } catch (error) {
      console.error("[BettingManager] Error processing batch:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Handle bets inside a database transaction: debit user balances and insert history entries
  private async processBetsInTransaction(
    betsToProcess: Map<string, StagedBet>
  ): Promise<void> {
    const session = await mongoose.startSession();
    try {
      await session.startTransaction();
      const userBets = new Map<string, UserBetGroup>();

      for (const [_, stagedBet] of betsToProcess) {
        const userId = stagedBet.payload.userId;
        const group = userBets.get(userId) || {
          bets: [],
          totalStake: 0,
          originalBalance: 0,
        };
        group.totalStake += stagedBet.payload.stake;
        group.bets.push(stagedBet);
        userBets.set(userId, group);
      }

      const successfulBetIds: string[] = [];
      const failedBetIds: string[] = [];
      const betHistories: any[] = [];

      for (const [userId, group] of userBets) {
        try {
          const updatedUser = await User.findOneAndUpdate(
            {
              _id: userId,
              accountStatus: AccountStatus.ACTIVE,
              accountBalance: { $gte: group.totalStake },
            },
            { $inc: { accountBalance: -group.totalStake } },
            { session, new: true, select: "accountBalance" }
          );

          if (updatedUser) {
            group.bets.forEach((bet) => {
              successfulBetIds.push(bet.betId);
              betHistories.push({
                roundId: "xxxx",
                userId: bet.payload.userId,
                stake: bet.payload.stake,
                payout: 0,
                cashoutMultiplier: 0,
                finalMultiplier: 0,
                autoCashoutMultiplier: bet.payload.autoCashoutMultiplier,
                status: BetStatus.PENDING,
                createdAt: new Date(),
              });
            });
          } else {
            group.bets.forEach((bet) => failedBetIds.push(bet.betId));
            console.log("failed bet", failedBetIds);
          }
        } catch {
          group.bets.forEach((bet) => failedBetIds.push(bet.betId));
        }
      }

      if (betHistories.length > 0)
        await BetHistory.insertMany(betHistories, { session });
      await session.commitTransaction();
      this.sendBatchNotifications(
        successfulBetIds,
        failedBetIds,
        betsToProcess
      );
    } catch (error) {
      await session.abortTransaction();
      for (const [betId, stagedBet] of betsToProcess) {
        const socket = this.betIdToSocketMap.get(betId);
        socket?.emit("betting:betFailed", {
          userId: stagedBet.payload.userId,
          stake: stagedBet.payload.stake,
          betId,
          reason: "System error during processing",
        });
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  // Notify users through sockets about result of their bets
  private sendBatchNotifications(
    successfulBetIds: string[],
    failedBetIds: string[],
    betsToProcess: Map<string, StagedBet>
  ): void {
    successfulBetIds.forEach((betId) => {
      const stagedBet = betsToProcess.get(betId);
      stagedBet?.socket.emit("betting:betConfirmed", {
        userId: stagedBet.payload.userId,
        stake: stagedBet.payload.stake,
        betId,
        message: "Bet confirmed and processed",
      });
    });

    failedBetIds.forEach((betId) => {
      const stagedBet = betsToProcess.get(betId);
      stagedBet?.socket.emit("betting:betFailed", {
        userId: stagedBet.payload.userId,
        stake: stagedBet.payload.stake,
        betId,
        reason: "Insufficient balance or account inactive",
      });
    });
  }

  // Check per-user limit for staging too many bets
  public canPlaceBet(userId: string): boolean {
    const userBets = this.userIdToBetIdsMap.get(userId);
    return !userBets || userBets.size < this.MAX_BETS_PER_USER;
  }

  // Return internal system diagnostics for observability
  public getSystemStats() {
    const stagedBetsByUser: { [userId: string]: number } = {};
    for (const [userId, betIds] of this.userIdToBetIdsMap) {
      stagedBetsByUser[userId] = betIds.size;
    }
    return {
      totalStagedBets: this.stagedBets.size,
      uniqueUsers: this.userIdToBetIdsMap.size,
      stagedBetsByUser,
      maxBetsPerUser: this.MAX_BETS_PER_USER,
      totalSocketMappings: this.betIdToSocketMap.size,
      isProcessing: this.isProcessing,
      bettingWindowOpen: this.bettingWindowOpen,
    };
  }
}

// Export the single instance of the betting manager
export const bettingManager = BettingManager.getInstance();
