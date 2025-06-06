import { io } from "../../app";
import { GAME_CONFIG } from "../../config/game.config";
import { SOCKET_EVENTS } from "../../config/socketEvents.config";
import { GamePhase } from "../../types/game.types";
import { bettingManager } from "../betting/bettingManager";
import RoundAnalyticsManager from "./roundAnalyticsManager";
import { roundStateManager } from "./roundStateManager";

const roundAnalyticsManager = new RoundAnalyticsManager();

class GameLifeCycleManager {
  private static instance: GameLifeCycleManager;

  private readonly BETTING_PERIOD = 5;
  private readonly COUNTDOWN_INTERVAL_MS = 100;
  private readonly MULTIPLIER_INTERVAL_MS = 100;

  private countdownIntervalId: NodeJS.Timeout | null = null;
  private multiplierTimeoutId: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance() {
    if (!GameLifeCycleManager.instance) {
      GameLifeCycleManager.instance = new GameLifeCycleManager();
    }

    return GameLifeCycleManager.instance;
  }

  public async startGame() {
    try {
      roundStateManager.setGamePhase(GamePhase.PREPARING);
      io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.PREPARING, {
        gamePhase: GamePhase.PREPARING,
      });

      // Wait until all bets finish processing before continuing.
      while (bettingManager.getIsProcessing()) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      roundStateManager.generateRoundResults();

      if (roundStateManager.getState().betsMap.size > 0) {
        await roundAnalyticsManager.saveRoundAnalytics();
      }

      roundStateManager.setGamePhase(GamePhase.RUNNING);
      io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.RUNNING, {
        gamePhase: GamePhase.RUNNING,
      });

      this.incrementMultiplier();
    } catch (err) {
      console.error("Failed to run the game", err);

      io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.ERROR, {
        message: "An error occurred on our end. We are working on it",
      });
    }
  }

  private incrementMultiplier() {
    const currentRoundState = roundStateManager.getState();
    const currentMultiplier = currentRoundState.currentMultiplier;
    const incrementValue =
      currentMultiplier * GAME_CONFIG.MULTIPLIER_GROWTH_RATE;
    const newMultiplier = currentMultiplier + incrementValue;
    const finalCrashPoint =
      currentRoundState.provablyFairOutcome?.finalMultiplier!;

    if (newMultiplier >= finalCrashPoint) {
      this.handleRoundEnd();
      return;
    }

    roundStateManager.setCurrentMultiplier(newMultiplier);
    io.emit(SOCKET_EVENTS.EMITTERS.BROADCAST_CURRENT_MULTIPLIER, {
      gamePhase: GamePhase.RUNNING,
      multiplier: newMultiplier,
    });

    console.log("Game Phase:", roundStateManager.getState().gamePhase);

    this.multiplierTimeoutId = setTimeout(() => {
      this.incrementMultiplier();
    }, this.MULTIPLIER_INTERVAL_MS);
  }

  private handleRoundEnd() {
    if (this.multiplierTimeoutId) {
      clearTimeout(this.multiplierTimeoutId);
      this.multiplierTimeoutId = null;
    }

    //broadcast to all clients that the round has ended
    io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.END, {
      gamePhase: GamePhase.END,
    });

    roundStateManager.reset();

    bettingManager.openBettingWindow();
    roundStateManager.setGamePhase(GamePhase.BETTING);

    const start = Date.now();

    this.countdownIntervalId = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const remaining = Math.max(this.BETTING_PERIOD - elapsed, 0);

      io.emit(SOCKET_EVENTS.EMITTERS.BROADCAST_NEXT_GAME_COUNT_DOWN, {
        gamePhase: GamePhase.BETTING,
        countDown: remaining,
      });

      if (remaining <= 0) {
        if (this.countdownIntervalId) {
          clearInterval(this.countdownIntervalId);
          this.countdownIntervalId = null;
        }

        bettingManager.closeBettingWindow();
        this.startGame();
      }

      io.emit(SOCKET_EVENTS.EMITTERS.BROADCAST_NEXT_GAME_COUNT_DOWN, {
        countDown: remaining,
        gamePhase: roundStateManager.getState().gamePhase,
      });
    }, this.COUNTDOWN_INTERVAL_MS);
  }
}

export const gameLifeCycleManager = GameLifeCycleManager.getInstance();
