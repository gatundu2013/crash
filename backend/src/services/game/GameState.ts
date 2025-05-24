import { SingleBet } from "../../types/bet.types";
import { GamePhase, GameResults } from "../../types/game.types";
import { MultiplierGenerator } from "./multiplierGenerator";
import { v4 as uuidv4 } from "uuid";

/**
 * GameState - Singleton class to manage the global state of the game
 * This class can be accessed from anywhere in the application
 */
export class GameState {
  private static instance: GameState;

  private gamePhase: GamePhase = GamePhase.PREPARING;
  private currentMultiplier: number = 1;
  private roundId: string | null = null;
  private gameResults: GameResults | null = null;
  private activeBets: Map<string, SingleBet> = new Map();
  private topStakes: SingleBet[] = [];

  // Private constructor to prevent direct instantiation
  private constructor() {}

  /**
   * Get the singleton instance of GameState
   */
  public static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }
    return GameState.instance;
  }

  public generateRoundResults(clientSeed: string) {
    const multiplierGenerator = new MultiplierGenerator({ clientSeed });

    this.gameResults = multiplierGenerator.generateGameResults();
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
    this.gameResults = null;
    this.activeBets.clear();
    this.topStakes = [];
  }
}
