import { GAME_CONFIG } from "../../config/game.config";
import {
  AcceptedBet,
  BetInMemory,
  BetStatus,
  TopStaker,
} from "../../types/bet.types";
import {
  ClientSeedDetails,
  GamePhase,
  ProvablyFairOutcomeI,
} from "../../types/game.types";
import { GameError } from "../../utils/errors/gameError";
import { bettingManager } from "../betting/bettingManager";
import { MultiplierGenerator } from "./multiplierGenerator";
import { v4 as uuidv4 } from "uuid";

/**
 * RoundStateManager - Singleton class to manage the state of a game round
 * This class can be accessed from anywhere in the application
 */
class RoundStateManager {
  private static instance: RoundStateManager;

  private gamePhase: GamePhase = GamePhase.PREPARING;
  private clientSeedDetails: ClientSeedDetails[] = [];
  private clientSeed: string = "";
  private currentMultiplier: number = 1;
  private roundId: string | null = null;
  private provablyFairOutcome: ProvablyFairOutcomeI | null = null;
  private totalBetAmount: number = 0;
  private activeBetsMap: Map<string, BetInMemory> = new Map(); // betId to Details
  private topStakers: TopStaker[] = [];

  // Private constructor to prevent direct instantiation
  private constructor() {
    bettingManager.on("acceptedBets", this.handleAcceptedBets.bind(this));
  }

  /**
   * Get the singleton instance of RoundState
   */
  public static getInstance(): RoundStateManager {
    if (!RoundStateManager.instance) {
      RoundStateManager.instance = new RoundStateManager();
    }
    return RoundStateManager.instance;
  }

  public generateProvablyFairOutcome() {
    if (this.gamePhase !== GamePhase.PREPARING) {
      console.log(
        `Round results can only be generated in ${GamePhase.PREPARING} phase`
      );
      throw new GameError({
        description: "An error occured on our end. We are working on it",
        httpCode: 500,
        isOperational: false,
        internalMessage: `Provably fair outcome generation 
        attempted during invalid game phase: ${this.gamePhase}. Expected phase: ${GamePhase.PREPARING}.`,
      });
    }

    const multiplierGenerator = new MultiplierGenerator({
      clientSeed: this.clientSeed,
      clientSeedDetails: this.clientSeedDetails,
    });

    this.provablyFairOutcome =
      multiplierGenerator.generateProvablyFairResults();
  }

  private updateClientSeed({ userId, seed }: ClientSeedDetails) {
    if (seed) {
      if (seed.trim().length < 5) return;

      if (this.clientSeedDetails.length >= GAME_CONFIG.MAX_CLIENT_SEEDS) return;

      const userSeedIsUsed = this.clientSeedDetails.some(
        (entry) => entry.userId === userId
      );

      if (userSeedIsUsed) return;

      this.clientSeedDetails.push({ seed, userId });
      this.clientSeed = `${this.clientSeed}${seed}`;
    }
  }

  //add bets to the current Round state
  private handleAcceptedBets(acceptedBets: AcceptedBet[]) {
    acceptedBets.forEach((bet) => {
      // Add bet in activeBetsMap
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

      // Handle top stakers logic
      const isTopStakersListFull =
        this.topStakers.length >= GAME_CONFIG.MAX_TOP_STAKERS;
      const lowestTopStaker = this.topStakers[this.topStakers.length - 1];

      const shouldAddToTopStakers =
        !isTopStakersListFull ||
        (lowestTopStaker && bet.payload.stake > lowestTopStaker.stake);

      if (shouldAddToTopStakers) {
        this.topStakers.push({
          cashoutMultiplier: null,
          betId: bet.payload.betId,
          payout: null,
          stake: bet.payload.stake,
          username: bet.payload.username,
        });

        // Sort by stake descending
        this.topStakers.sort((a, b) => b.stake - a.stake);

        // Keep only the top MAX_TOP_STAKERS
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

  // setters
  public setGamePhase(gamePhase: GamePhase): void {
    this.gamePhase = gamePhase;
  }

  public setCurrentMultiplier(multiplier: number): void {
    this.currentMultiplier = multiplier;
  }

  //getters
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

  public reset(): void {
    this.gamePhase = GamePhase.PREPARING;
    this.currentMultiplier = 1;
    this.roundId = null;
    this.provablyFairOutcome = null;
    this.activeBetsMap.clear();
    this.topStakers = [];
    this.roundId = uuidv4();
  }
}

export const roundStateManager = RoundStateManager.getInstance();
