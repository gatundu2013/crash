import { io } from "../../../app";
import { GAME_CONFIG } from "../../../config/env.config";
import { SOCKET_EVENTS } from "../../../config/socketEvents.config";
import {
  AcceptedBet,
  BetInMemory,
  BetStatus,
  StagedCashout,
} from "../../../types/backend/bet.types";
import {
  BroadcastCashoutSuccessRes,
  BroadcastPlaceBetSuccessRes,
  TopStakers,
} from "../../../types/shared/socketIo/betTypes";
import {
  ClientSeedDetails,
  GamePhase,
  PreviousMultiplier,
  ProvablyFairOutcomeI,
} from "../../../types/shared/socketIo/gameTypes";
import { GameError } from "../../../utils/errors/gameError";
import { eventBus, EVENT_NAMES } from "./eventBus";
import { MultiplierGenerator } from "./multiplierGenerator";
import { v4 as uuidv4 } from "uuid";

/**
 * RoundStateManager
 * =================
 *
 * Manages the full in-memory state for a single round of the game.
 * Tracks game phase, bets, cashouts, provably fair outcome, top stakers, and historical multipliers.
 *
 * This class acts as a centralized state holder for the round lifecycle and interacts with:
 * - Bet handling (via event bus)
 * - Cashout processing
 * - Game lifecycle manager
 */
class RoundStateManager {
  private static instance: RoundStateManager;

  private readonly config = {
    MULTIPLIER_CACHE_SIZE: 20,
  } as const;

  private gamePhase: GamePhase = GamePhase.PREPARING;
  private clientSeedDetails: ClientSeedDetails[] = [];
  private clientSeed = "";
  private currentMultiplier = 1;
  private roundId: string | null = null;
  private previousMultipliers: PreviousMultiplier[] = [];
  private provablyFairOutcome: ProvablyFairOutcomeI | null = null;
  private totalBetAmount = 0;
  private totalCashoutAmount = 0;
  private numberOfCashouts = 0;
  private activeBets: Map<string, BetInMemory> = new Map();
  private topStakers: TopStakers[] = [];

  private constructor() {
    eventBus.on(EVENT_NAMES.ACCEPTED_BETS, this.handleAcceptedBets.bind(this));
    eventBus.on(
      EVENT_NAMES.CASHOUTS_PROCESSED,
      this.handleProcessedCashouts.bind(this)
    );
  }

  public static getInstance(): RoundStateManager {
    if (!RoundStateManager.instance) {
      RoundStateManager.instance = new RoundStateManager();
    }
    return RoundStateManager.instance;
  }

  /**
   * Generates provably fair multiplier for the round.
   * Throws an error if called outside the PREPARING phase.
   */
  public generateProvablyFairOutcome() {
    try {
      if (this.gamePhase !== GamePhase.PREPARING) {
        throw new GameError({
          description: "An error occurred on our end. We are working on it.",
          httpCode: 500,
          isOperational: false,
          internalMessage: `Provably fair generation called during invalid phase: ${this.gamePhase}`,
        });
      }

      const generator = new MultiplierGenerator({
        clientSeed: this.clientSeed,
        clientSeedDetails: this.clientSeedDetails,
      });

      this.provablyFairOutcome = generator.generateProvablyFairResults();
    } catch (err) {
      console.error("Error generating provably fair outcome:", err);
      throw err;
    }
  }

  /**
   * Called when a batch of bets are fully processed.
   * Updates internal state, tracks top stakers, and emits bet summary to all clients .
   */
  private handleAcceptedBets(acceptedBets: AcceptedBet[]) {
    acceptedBets.forEach((bet) => {
      const { payload } = bet;

      // Track the active bet
      this.activeBets.set(payload.betId, {
        bet: {
          userId: payload.userId,
          stake: payload.stake,
          betId: payload.betId,
          autoCashoutMultiplier: payload.autoCashoutMultiplier,
          cashoutMultiplier: null,
          payout: null,
          status: BetStatus.PENDING,
          criticalMultiplier: GAME_CONFIG.MAX_HOUSE_PAYOUT / payload.stake,
        },
        socket: bet.socket,
      });

      this.totalBetAmount += payload.stake;

      // Update top stakers list if applicable
      const isFull = this.topStakers.length >= GAME_CONFIG.MAX_TOP_STAKERS;
      const minStake = isFull
        ? this.topStakers[this.topStakers.length - 1].stake
        : 0;

      if (!isFull || payload.stake > minStake) {
        this.topStakers.push({
          betId: payload.betId,
          username: payload.username,
          stake: payload.stake,
          payout: null,
          cashoutMultiplier: null,
        });

        this.topStakers.sort((a, b) => b.stake - a.stake);

        if (this.topStakers.length > GAME_CONFIG.MAX_TOP_STAKERS) {
          this.topStakers.pop();
        }

        this.updateClientSeed({
          username: payload.username,
          seed: payload.clientSeed,
        });
      }
    });

    io.emit(SOCKET_EVENTS.EMITTERS.BROADCAST_SUCCESSFUL_BETS, {
      totalBetAmount: this.totalBetAmount,
      topStakers: this.topStakers,
      totalBets: this.activeBets.size,
    } satisfies BroadcastPlaceBetSuccessRes);
  }

  /**
   * Called when a batch of cashouts are fully processed.
   * Marks winning bets, updates payout data, and notifies clients.
   */
  private handleProcessedCashouts(
    processedCashouts: (StagedCashout & { newAccountBalance: number })[]
  ) {
    const indexMap = new Map<string, number>();
    this.topStakers.forEach((s, i) => indexMap.set(s.betId, i));

    let hasChanges = false;

    processedCashouts.forEach((cashout) => {
      const activeBet = this.activeBets.get(cashout.betId);
      if (activeBet) {
        activeBet.bet.status = BetStatus.WON;
        activeBet.bet.payout = cashout.payout;
        activeBet.bet.cashoutMultiplier = cashout.cashoutMultiplier;

        // Important -- Used to calulate house Profit
        this.totalCashoutAmount += cashout.payout;
        this.numberOfCashouts += 1;
      }

      const idx = indexMap.get(cashout.betId);
      if (idx !== undefined) {
        const staker = this.topStakers[idx];
        staker.payout = cashout.payout;
        staker.cashoutMultiplier = cashout.cashoutMultiplier;
        hasChanges = true;
      }
    });

    io.emit(
      SOCKET_EVENTS.EMITTERS.BROADCAST_SUCCESSFUL_CASHOUTS,
      (hasChanges
        ? {
            topStakers: this.topStakers,
            numberOfCashouts: this.numberOfCashouts,
          }
        : {
            numberOfCashouts: this.numberOfCashouts,
          }) satisfies BroadcastCashoutSuccessRes
    );
  }

  /**
   * Updates the global client seed using new seed info from user.
   * Deduplicates by username and enforces max seed limit.
   */
  private updateClientSeed({ username, seed }: ClientSeedDetails) {
    // Invalid seed
    if (!GAME_CONFIG.CLIENT_SEED_REGEX.test(seed || "")) {
      return;
    }

    // We have max-seeds
    if (this.clientSeedDetails.length >= GAME_CONFIG.MAX_CLIENT_SEEDS) {
      return;
    }

    // User seed can only be used once
    if (this.clientSeedDetails.some((entry) => entry.username === username)) {
      return;
    }

    this.clientSeedDetails.push({ username, seed });
    this.clientSeed += seed;
  }

  /**
   * Updates the current multiplier.
   * Used during the running phase by  game lifecycle.
   */
  public setCurrentMultiplier(multiplier: number): void {
    this.currentMultiplier = multiplier;
  }

  /**
   * Sets the current game phase (BETTING, PREPARING, RUNNING, END).
   */
  public setGamePhase(gamePhase: GamePhase): void {
    this.gamePhase = gamePhase;
  }

  /**
   * Returns a full snapshot of the current round state.
   */
  public getState() {
    return {
      gamePhase: this.gamePhase,
      currentMultiplier: this.currentMultiplier,
      roundId: this.roundId,
      provablyFairOutcome: this.provablyFairOutcome,
      topStakers: this.topStakers,
      clientSeedDetails: this.clientSeedDetails,
      clientSeed: this.clientSeed,
      activeBets: this.activeBets,
      totalBetAmount: this.totalBetAmount,
      totalCashoutAmount: this.totalCashoutAmount,
      previousMultipliers: this.previousMultipliers,
    };
  }

  /**
   * Adds the final multiplier for the round to a rolling history cache.
   * Used for displaying recent round history to players.
   */
  public updatePreviousMultipliers(entry: PreviousMultiplier): void {
    if (!entry.roundId || !entry.finalMultiplier) return;
    if (this.gamePhase !== GamePhase.END) return;

    this.previousMultipliers.unshift(entry);
    if (this.previousMultipliers.length > this.config.MULTIPLIER_CACHE_SIZE) {
      this.previousMultipliers.pop();
    }
  }

  /**
   * Resets all round state for a new game:
   * - Clears bets, seeds, payouts, round info
   * - Generates new round ID
   */
  public reset(): string {
    this.gamePhase = GamePhase.PREPARING;
    this.clientSeedDetails = [];
    this.clientSeed = "";
    this.currentMultiplier = 1;
    this.provablyFairOutcome = null;
    this.totalBetAmount = 0;
    this.totalCashoutAmount = 0;
    this.numberOfCashouts = 0;
    this.activeBets.clear();
    this.topStakers = [];
    this.roundId = uuidv4();

    return this.roundId;
  }
}

export const roundStateManager = RoundStateManager.getInstance();
