import { GAME_CONFIG } from "../../config/game.config";
import { SingleBet } from "../../types/bet.types";
import {
  ClientSeedDetails,
  GamePhase,
  ProvablyFairOutcomeI,
} from "../../types/game.types";
import { MultiplierGenerator } from "./multiplierGenerator";
import { v4 as uuidv4 } from "uuid";

/**
 * RoundStateManager - Singleton class to manage the state of a game round
 * This class can be accessed from anywhere in the application
 */
export class RoundStateManager {
  private static instance: RoundStateManager;

  private gamePhase: GamePhase = GamePhase.PREPARING;
  private clientSeedDetails: ClientSeedDetails[] = [];
  private clientSeed: string = "";
  private currentMultiplier: number = 1;
  private roundId: string | null = null;
  private provablyFairOutcome: ProvablyFairOutcomeI | null = null;
  private totalBetAmount: number = 0;
  private bets: Map<string, SingleBet> = new Map();
  private topStakes: SingleBet[] = [];

  // Private constructor to prevent direct instantiation
  private constructor() {}

  /**
   * Get the singleton instance of RoundState
   */
  public static getInstance(): RoundStateManager {
    if (!RoundStateManager.instance) {
      RoundStateManager.instance = new RoundStateManager();
    }
    return RoundStateManager.instance;
  }

  public generateRoundResults(clientSeed: string) {
    const multiplierGenerator = new MultiplierGenerator({
      clientSeed,
      clientSeedDetails: this.clientSeedDetails,
    });

    this.provablyFairOutcome =
      multiplierGenerator.generateProvablyFairResults();
    this.roundId = uuidv4();
  }

  // setters
  public setGamePhase(gamePhase: GamePhase): void {
    this.gamePhase = gamePhase;
  }

  public setCurrentMultiplier(multiplier: number): void {
    this.currentMultiplier = multiplier;
  }

  public addBet(bet: SingleBet) {
    this.bets.set(bet.betId, bet);
    this.totalBetAmount += bet.stake;

    const isTopStakesFull =
      this.topStakes.length >= GAME_CONFIG.MAX_TOP_STAKERS;
    const lowestTopStake = this.topStakes[this.topStakes.length - 1];
    const shouldAddToTopStakes =
      !isTopStakesFull || bet.stake > lowestTopStake.stake;

    if (shouldAddToTopStakes) {
      this.topStakes.push(bet);
      this.topStakes.sort((a, b) => b.stake - a.stake);

      if (this.topStakes.length > 30) {
        this.topStakes.pop();
      }
    }
  }

  public updateClientSeed({ userId, seed }: ClientSeedDetails) {
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

  //getters
  public getState() {
    return {
      gamePhase: this.gamePhase,
      currentMultiplier: this.currentMultiplier,
      roundId: this.roundId,
      provablyFairOutcome: this.provablyFairOutcome,
      topStakes: this.topStakes,
      clientSeedDetails: this.clientSeedDetails,
      clientSeed: this.clientSeed,
      bets: this.bets,
      totalBetAmount: this.totalBetAmount,
    };
  }

  public reset(): void {
    this.gamePhase = GamePhase.PREPARING;
    this.currentMultiplier = 1;
    this.roundId = null;
    this.provablyFairOutcome = null;
    this.bets.clear();
    this.topStakes = [];
  }
}
