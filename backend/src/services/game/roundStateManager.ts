import { SingleBet } from "../../types/bet.types";
import { GamePhase, GameResults } from "../../types/game.types";
import { MultiplierGenerator } from "./multiplierGenerator";
import { v4 as uuidv4 } from "uuid";

/**
 * RoundStateManager - Singleton class to manage the state of a game round
 * This class can be accessed from anywhere in the application
 */
export class RoundStateManager {
  private static instance: RoundStateManager;

  private gamePhase: GamePhase = GamePhase.PREPARING;
  private currentMultiplier: number = 1;
  private roundId: string | null = null;
  private provablyFairOutcome: GameResults | null = null;
  private activeBets: Map<string, SingleBet> = new Map();
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
    const multiplierGenerator = new MultiplierGenerator({ clientSeed });
    this.provablyFairOutcome = multiplierGenerator.generateGameResults();
    this.roundId = uuidv4();
  }

  public setGamePhase(gamePhase: GamePhase): void {
    this.gamePhase = gamePhase;
  }

  public setCurrentMultiplier(multiplier: number): void {
    this.currentMultiplier = multiplier;
  }

  public reset(): void {
    this.gamePhase = GamePhase.PREPARING;
    this.currentMultiplier = 1;
    this.roundId = null;
    this.provablyFairOutcome = null;
    this.activeBets.clear();
    this.topStakes = [];
  }

  public getState() {
    return {
      gamePhase: this.gamePhase,
      currentMultiplier: this.currentMultiplier,
      roundId: this.roundId,
      provablyFairOutcome: this.provablyFairOutcome,
      topStakes: this.topStakes,
    };
  }
}
