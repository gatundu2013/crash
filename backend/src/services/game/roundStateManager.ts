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
  private totalBetAmount = 0;
  private totalCashouts = 0;
  private activeBetsMap: Map<string, BetInMemory> = new Map();
  private topStakers: TopStaker[] = [];

  // Subscribe to events from betting and cashout managers
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

      // Calculate total bet Amount
      this.totalBetAmount += bet.payload.stake;

      // A new bet only matters if the list isn't full, OR if the bet is bigger than the smallest in the list.
      const isListFull = this.topStakers.length >= GAME_CONFIG.MAX_TOP_STAKERS;
      const lowestStakeInList = isListFull
        ? this.topStakers[this.topStakers.length - 1].stake
        : 0;

      // Modify the array if the new bet qualifies to be in the top list
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

      // Emit roundInfo to all connected clients
      io.emit(SOCKET_EVENTS.EMITTERS.BROADCAST_SUCCESSFUL_BETS, {
        totalBetAmount: this.totalBetAmount,
        topStakers: this.topStakers,
        totalBets: this.activeBetsMap.size,
      });
    });
  }

  /**
   * Updates state for successfully processed cashouts
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
      const activeBetEntry = this.activeBetsMap.get(cashout.betId);

      if (activeBetEntry) {
        activeBetEntry.bet.status = BetStatus.WON;
        activeBetEntry.bet.payout = cashout.payout;
        activeBetEntry.bet.cashoutMultiplier = cashout.cashoutMultiplier;
      }

      const stakerIdx = topStakerIndexMap.get(cashout.betId);
      if (stakerIdx !== undefined) {
        const staker = this.topStakers[stakerIdx];
        staker.payout = cashout.payout;
        staker.cashoutMultiplier = cashout.cashoutMultiplier;
        hasChanges = true;
      }
    });

    this.totalCashouts += processedCashouts.length;

    const responseData = hasChanges
      ? { topStakers: this.topStakers, totalCashouts: this.totalCashouts }
      : { totalCashouts: this.totalCashouts };
    io.emit(SOCKET_EVENTS.EMITTERS.BROADCAST_SUCCESSFUL_CASHOUTS, responseData);
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
  public reset() {
    this.gamePhase = GamePhase.IDLE;
    this.clientSeedDetails = [];
    this.clientSeed = "";
    this.currentMultiplier = 1;
    this.provablyFairOutcome = null;
    this.totalBetAmount = 0;
    this.activeBetsMap.clear();
    this.topStakers = [];
    this.totalCashouts = 0;
    this.roundId = uuidv4();

    return this.roundId;
  }
}

export const roundStateManager = RoundStateManager.getInstance();
