import { io } from "../../app";
import { GAME_CONFIG } from "../../config/game.config";
import { GamePhase } from "../../types/game.types";
import { RoundStateManager } from "./roundStateManager";

export class GameLifeCycleManager {
  private static instance: GameLifeCycleManager;

  private constructor() {}

  public static getInstance() {
    if (!GameLifeCycleManager.instance) {
      GameLifeCycleManager.instance = new GameLifeCycleManager();
    }

    return GameLifeCycleManager.instance;
  }

  public startGame() {
    const roundStateManager = RoundStateManager.getInstance();

    roundStateManager.setGamePhase(GamePhase.PREPARING);
    io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.PREPARING, {
      gamePhase: GamePhase.PREPARING,
    });

    roundStateManager.generateRoundResults("");

    //TODO: save game analytics to the database

    roundStateManager.setGamePhase(GamePhase.RUNNING);
    io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.RUNNING, {
      gamePhase: GamePhase.RUNNING,
    });

    this.incrementMultiplier();
  }

  private incrementMultiplier = () => {
    const roundStateManager = RoundStateManager.getInstance();
    const currentRoundState = roundStateManager.getState();

    const incrementValue =
      currentRoundState.currentMultiplier * GAME_CONFIG.MULTIPLIER_GROWTH_RATE;

    const newMultiplier = currentRoundState.currentMultiplier + incrementValue;

    const finalCrashPoint =
      currentRoundState.provablyFairOutcome?.finalMultiplier!;

    if (newMultiplier >= finalCrashPoint) {
      // bust all bets that we not cashed out
      // calculate profit made by the round
      // start new round

      roundStateManager.reset();
      this.startGame();

      return;
    }

    roundStateManager.setCurrentMultiplier(newMultiplier);
    io.emit(SOCKET_EVENTS.EMITTERS.BROADCAST_CURRENT_MULTIPLIER, {
      gamePhase: GamePhase.RUNNING,
      multiplier: newMultiplier,
    });

    setTimeout(() => {
      this.incrementMultiplier();
    }, 100);
  };
}
