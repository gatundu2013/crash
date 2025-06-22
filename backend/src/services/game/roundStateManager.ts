import { io } from "../../app";
import { GAME_CONFIG } from "../../config/game.config";
import { SOCKET_EVENTS } from "../../config/socketEvents.config";
import {
  AcceptedBet,
  BetInMemory,
  BetStatus,
  BetWithAutoCashout,
  StagedCashout,
  TopStaker,
} from "../../types/bet.types";
import {
  ClientSeedDetails,
  GamePhase,
  PreviousMultiplier,
  ProvablyFairOutcomeI,
} from "../../types/game.types";
import { GameError } from "../../utils/errors/gameError";
import { eventBus, EVENT_NAMES } from "./eventBus";
import { MultiplierGenerator } from "./multiplierGenerator";
import { v4 as uuidv4 } from "uuid";

/**
 * Singleton class for managing the state of a single game round.
 * Handles all in-memory tracking of bets, auto-cashouts, stakers, and round lifecycle.
 * Coordinates with event bus for bet acceptance and cashout processing.
 */
class RoundStateManager {
  private static instance: RoundStateManager;

  private readonly config = {
    MULTIPLIER_CACHE_SIZE: 15,
  } as const;

  private gamePhase: GamePhase = GamePhase.IDLE;
  private clientSeedDetails: ClientSeedDetails[] = [];
  private clientSeed = ""; // Concatenated from client seed details
  private currentMultiplier = 1;
  private roundId: string | null = null;
  private previousMultipliers: PreviousMultiplier[] = [];
  private provablyFairOutcome: ProvablyFairOutcomeI | null = null;
  private totalBetAmount = 0;
  private totalCashoutAmount = 0;
  private numberOfCashouts = 0;
  private activeBets: Map<string, BetInMemory> = new Map();
  private betsWithAutoCashouts: Map<string, BetWithAutoCashout> = new Map();
  private topStakers: TopStaker[] = []; // sent to clients --- For UI purposes

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
   * Generates provably fair results for the round.
   * Throws an error if called in an invalid game phase.
   */
  public generateProvablyFairOutcome() {
    try {
      if (this.gamePhase !== GamePhase.PREPARING) {
        throw new GameError({
          description: "An error occured on our end. We are working on it",
          httpCode: 500,
          isOperational: false,
          internalMessage: `Provably fair outcome generation attempted during invalid game phase: ${this.gamePhase}.`,
        });
      }

      const multiplierGenerator = new MultiplierGenerator({
        clientSeed: this.clientSeed,
        clientSeedDetails: this.clientSeedDetails,
      });

      this.provablyFairOutcome =
        multiplierGenerator.generateProvablyFairResults();
    } catch (error) {
      console.error("Error while generating provably fair outcome", error);
      throw error;
    }
  }

  /**
   * Updates the global client seed with a new user's seed.
   * Ignores seeds that are too short or duplicate user entries.
   * Used to ensure provable fairness for the round.
   */
  private updateClientSeed({ userId, seed }: ClientSeedDetails) {
    // Invalid seed
    if (!seed || seed.trim().length < 5) return;

    // We have maximum seeds
    if (this.clientSeedDetails.length >= GAME_CONFIG.MAX_CLIENT_SEEDS) return;

    const alreadyUsed = this.clientSeedDetails.some(
      (entry) => entry.userId === userId
    );
    if (alreadyUsed) return;

    this.clientSeedDetails.push({ seed, userId });
    this.clientSeed = `${this.clientSeed}${seed}`;
  }

  /**
   * Adds accepted bets to the current round's state.
   * Populates activeBets, optionally adds to betsWithAutoCashouts, updates total bet amount, and manages top stakers.
   * Emits updated round info to all connected clients.
   *
   * @param acceptedBets Array of accepted bets for the round
   */
  private handleAcceptedBets(acceptedBets: AcceptedBet[]) {
    acceptedBets.forEach((bet) => {
      // Store the bet in the active bets map for tracking and future cashout.
      this.activeBets.set(bet.payload.betId, {
        bet: {
          autoCashoutMultiplier: bet.payload.autoCashoutMultiplier,
          betId: bet.payload.betId,
          cashoutMultiplier: null,
          payout: null,
          userId: bet.payload.userId,
          stake: bet.payload.stake,
          status: BetStatus.PENDING,
        },
        socket: bet.socket,
      });

      // If this bet has an auto-cashout multiplier, track it for automatic cashout processing.
      // This optimizes server operations by focusing only on relevant bets.
      if (bet.payload.autoCashoutMultiplier) {
        this.betsWithAutoCashouts.set(bet.payload.betId, {
          autoCashoutMultiplier: bet.payload.autoCashoutMultiplier,
          isProcessed: false,
        });
      }

      // Increment the total bet amount for this round.
      this.totalBetAmount += bet.payload.stake;

      // --- Top stakers update logic ---
      // Only add to top stakers if the list isn't full or the new bet is larger than the smallest in the list.
      const isListFull = this.topStakers.length >= GAME_CONFIG.MAX_TOP_STAKERS;
      const lowestStakeInList = isListFull
        ? this.topStakers[this.topStakers.length - 1].stake
        : 0;

      // Add to the top stakers array if this bet qualifies.
      if (!isListFull || bet.payload.stake > lowestStakeInList) {
        this.topStakers.push({
          betId: bet.payload.betId,
          cashoutMultiplier: null,
          payout: null,
          stake: bet.payload.stake,
          username: bet.payload.username,
        });

        if (this.topStakers.length > GAME_CONFIG.MAX_TOP_STAKERS) {
          this.topStakers.pop();
        }

        this.topStakers.sort((a, b) => b.stake - a.stake);

        this.updateClientSeed({
          seed: bet.payload.clientSeed,
          userId: bet.payload.userId,
        });
      }
    });

    // Emit roundInfo to all connected clients
    io.emit(SOCKET_EVENTS.EMITTERS.BROADCAST_SUCCESSFUL_BETS, {
      totalBetAmount: this.totalBetAmount,
      topStakers: this.topStakers,
      totalBets: this.activeBets.size,
    });
  }

  /**
   * Updates state for successfully processed cashouts.
   * Marks bets as WON, updates payouts and multipliers for both active bets and top stakers.
   * Emits updated cashout info to all clients.
   *
   * @param processedCashouts Array of processed cashout objects
   */
  private handleProcessedCashouts(
    processedCashouts: (StagedCashout & { newAccountBalance: number })[]
  ) {
    const topStakerIndexMap = new Map<string, number>();
    this.topStakers.forEach((staker, index) =>
      topStakerIndexMap.set(staker.betId, index)
    );

    let hasChanges = false;

    processedCashouts.forEach((cashout) => {
      const activeBetEntry = this.activeBets.get(cashout.betId);

      if (activeBetEntry) {
        activeBetEntry.bet.status = BetStatus.WON;
        activeBetEntry.bet.payout = cashout.payout;
        activeBetEntry.bet.cashoutMultiplier = cashout.cashoutMultiplier;

        // Calcuate total Amount
        this.totalCashoutAmount += cashout.payout;
      }

      // Check if player is a top staker
      const stakerIdx = topStakerIndexMap.get(cashout.betId);
      if (stakerIdx !== undefined) {
        const staker = this.topStakers[stakerIdx];
        staker.payout = cashout.payout;
        staker.cashoutMultiplier = cashout.cashoutMultiplier;
        hasChanges = true;
      }
    });

    this.numberOfCashouts += processedCashouts.length;

    const responseData = hasChanges
      ? { topStakers: this.topStakers, numberOfCashouts: this.numberOfCashouts }
      : { numberOfCashouts: this.numberOfCashouts };
    io.emit(SOCKET_EVENTS.EMITTERS.BROADCAST_SUCCESSFUL_CASHOUTS, responseData);
  }

  // ------------------- Setters and State Accessors -------------------

  /**
   * Sets the current game phase.
   * @param gamePhase The new game phase
   */
  public setGamePhase(gamePhase: GamePhase): void {
    this.gamePhase = gamePhase;
  }

  /**
   * Sets the current multiplier for the round.
   * @param multiplier The new multiplier value
   */
  public setCurrentMultiplier(multiplier: number): void {
    this.currentMultiplier = multiplier;
  }

  /**
   * Returns a snapshot of the current round state for use by other managers or debugging.
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
      betsWithAutoCashouts: this.betsWithAutoCashouts,
    };
  }

  /**
   * Cache multipliers of a specific size
   * Why: So that new users to the app can see game History
   * This is for UI purposes
   */
  public updatePreviousMultipliers(params: PreviousMultiplier) {
    if (!params.roundId || !params.finalMultiplier) return;

    if (this.gamePhase !== GamePhase.END) return;

    this.previousMultipliers.unshift(params);

    if (this.previousMultipliers.length >= this.config.MULTIPLIER_CACHE_SIZE) {
      this.previousMultipliers.pop();
    }
  }

  /**
   * Resets all round state for a new game.
   * Clears all bets, cashouts, stakers, seeds, and generates a new round ID.
   * @returns The new round ID
   */
  public reset() {
    this.gamePhase = GamePhase.IDLE;
    this.clientSeedDetails = [];
    this.clientSeed = "";
    this.currentMultiplier = 1;
    this.provablyFairOutcome = null;
    this.totalBetAmount = 0;
    this.activeBets.clear();
    this.betsWithAutoCashouts.clear();
    this.topStakers = [];
    this.numberOfCashouts = 0;
    this.totalCashoutAmount = 0;
    this.roundId = uuidv4();

    return this.roundId;
  }
}

export const roundStateManager = RoundStateManager.getInstance();
