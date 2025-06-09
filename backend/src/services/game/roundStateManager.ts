import { io } from "../../app";
import { GAME_CONFIG } from "../../config/game.config";
import { SOCKET_EVENTS } from "../../config/socketEvents.config";
import {
  AcceptedBet,
  BetInMemory,
  BetStatus,
  StagedCashout,
  TopStaker,
} from "../../types/bet.types";
import {
  ClientSeedDetails,
  GamePhase,
  ProvablyFairOutcomeI,
} from "../../types/game.types";
import { GameError } from "../../utils/errors/gameError";
import { eventBus, EVENT_NAMES } from "../eventBus";
import { MultiplierGenerator } from "./multiplierGenerator";
import { v4 as uuidv4 } from "uuid";

/**
 * Singleton class for managing state of a single game round
 */
class RoundStateManager {
  private static instance: RoundStateManager;

  private gamePhase: GamePhase = GamePhase.IDLE;
  private clientSeedDetails: ClientSeedDetails[] = [];
  private clientSeed: string = "";
  private currentMultiplier: number = 1;
  private roundId: string | null = null;
  private provablyFairOutcome: ProvablyFairOutcomeI | null = null;
  private totalBetAmount: number = 0;
  private activeBetsMap: Map<string, BetInMemory> = new Map();
  private topStakers: TopStaker[] = [];

  // Subscribe to events from betting and cashout managers
  private constructor() {
    eventBus.on(EVENT_NAMES.BETS_ACCEPTED, this.handleAcceptedBets.bind(this));
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
   * Generates provably fair results if in the correct phase
   */
  public generateProvablyFairOutcome() {
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
  }

  /**
   * Updates the global client seed with a new user's seed if valid
   */
  private updateClientSeed({ userId, seed }: ClientSeedDetails) {
    if (!seed || seed.trim().length < 5) return;
    if (this.clientSeedDetails.length >= GAME_CONFIG.MAX_CLIENT_SEEDS) return;

    const alreadyUsed = this.clientSeedDetails.some(
      (entry) => entry.userId === userId
    );
    if (alreadyUsed) return;

    this.clientSeedDetails.push({ seed, userId });
    this.clientSeed += seed;
  }

  /**
   * Adds accepted bets to the current round's state
   */
  private handleAcceptedBets(acceptedBets: AcceptedBet[]) {
    acceptedBets.forEach((bet) => {
      this.activeBetsMap.set(bet.payload.betId, {
        bet: {
          autoCashoutMultiplier: 1,
          betId: bet.payload.betId,
          cashoutMultiplier: 40,
          payout: null,
          userId: bet.payload.userId,
          stake: bet.payload.stake,
          status: BetStatus.PENDING,
        },
        socket: bet.socket,
      });

      this.totalBetAmount += bet.payload.stake;

      // Update top stakers list
      const isListFull = this.topStakers.length >= GAME_CONFIG.MAX_TOP_STAKERS;
      const lowest = this.topStakers[this.topStakers.length - 1];

      if (!isListFull || (lowest && bet.payload.stake > lowest.stake)) {
        this.topStakers.push({
          cashoutMultiplier: null,
          betId: bet.payload.betId,
          payout: null,
          stake: bet.payload.stake,
          username: bet.payload.username,
        });

        this.topStakers.sort((a, b) => b.stake - a.stake);
        if (this.topStakers.length > GAME_CONFIG.MAX_TOP_STAKERS) {
          this.topStakers.pop();
        }
      }

      this.updateClientSeed({
        seed: bet.payload.clientSeed,
        userId: bet.payload.userId,
      });
    });
  }

  /**
   * Updates state for successfully processed cashouts
   */
  private handleProcessedCashouts(
    successfulCashouts: (StagedCashout & { newAccountBalance: number })[]
  ) {
    if (!successfulCashouts) return;

    const indexMap = new Map<string, number>();
    this.topStakers.forEach((bet, i) => indexMap.set(bet.betId, i));

    let modified = false;

    successfulCashouts.forEach((cashout) => {
      const betRecord = this.activeBetsMap.get(cashout.betId);
      if (betRecord) {
        betRecord.bet.status = BetStatus.WON;
        betRecord.bet.payout = cashout.payout;
        betRecord.bet.cashoutMultiplier = cashout.cashoutMultiplier;
      }

      const stakerIndex = indexMap.get(cashout.betId);
      if (stakerIndex !== undefined) {
        const topStaker = this.topStakers[stakerIndex];
        topStaker.payout = cashout.payout;
        topStaker.cashoutMultiplier = cashout.cashoutMultiplier;
        modified = true;
      }
    });

    if (modified) {
      io.emit(SOCKET_EVENTS.EMITTERS.BROADCAST_TOP_STAKERS, {
        topStakers: this.topStakers,
      });
    }
  }

  // Setters
  public setGamePhase(gamePhase: GamePhase): void {
    this.gamePhase = gamePhase;
  }

  public setCurrentMultiplier(multiplier: number): void {
    this.currentMultiplier = multiplier;
  }

  // Get snapshot of round state
  public getState() {
    return {
      gamePhase: this.gamePhase,
      currentMultiplier: this.currentMultiplier,
      roundId: this.roundId,
      provablyFairOutcome: this.provablyFairOutcome,
      topStakers: this.topStakers,
      clientSeedDetails: this.clientSeedDetails,
      clientSeed: this.clientSeed,
      betsMap: this.activeBetsMap,
      totalBetAmount: this.totalBetAmount,
    };
  }

  /**
   * Resets round state for a new game
   */
  public reset(): void {
    this.gamePhase = GamePhase.PREPARING;
    this.currentMultiplier = 1;
    this.roundId = uuidv4();
    this.provablyFairOutcome = null;
    this.activeBetsMap.clear();
    this.topStakers = [];
  }
}

export const roundStateManager = RoundStateManager.getInstance();
