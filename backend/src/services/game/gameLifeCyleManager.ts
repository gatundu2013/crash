import { io } from "../../app";
import { GAME_CONFIG } from "../../config/game.config";
import { SOCKET_EVENTS } from "../../config/socketEvents.config";
import { GamePhase } from "../../types/game.types";
import RoundAnalyticsManager from "./roundAnalyticsManager";
import { RoundStateManager } from "./roundStateManager";

const roundAnalyticsManager = new RoundAnalyticsManager();

export class GameLifeCycleManager {
  private static instance: GameLifeCycleManager;

  private constructor() {}

  public static getInstance() {
    if (!GameLifeCycleManager.instance) {
      GameLifeCycleManager.instance = new GameLifeCycleManager();
    }

    return GameLifeCycleManager.instance;
  }

  public async startGame() {
    try {
      const roundStateManager = RoundStateManager.getInstance();

      roundStateManager.setGamePhase(GamePhase.PREPARING);
      io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.PREPARING, {
        gamePhase: GamePhase.PREPARING,
      });

      roundStateManager.generateRoundResults("");

      if (roundStateManager.getState().bets.size >= 0) {
        await roundAnalyticsManager.saveRoundAnalytics();
      }

      roundStateManager.setGamePhase(GamePhase.RUNNING);
      io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.RUNNING, {
        gamePhase: GamePhase.RUNNING,
      });

      this.incrementMultiplier();
    } catch (err) {
      console.log("Failed to run the game", err);

      io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.ERROR, {
        message: "An error occured on our end. We are working on it",
      });
    }
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
