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
  private timeBeforeNextRound = this.BETTING_PERIOD;

  private countdownIntervalId: NodeJS.Timeout | null = null;

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

      console.log("Game Phase:", roundStateManager.getState().gamePhase);

      roundStateManager.generateRoundResults("");

      console.log("RoundOutcome:", roundStateManager.getState());

      if (roundStateManager.getState().betsMap.size > 0) {
        console.log("Saving Bets to db");
        await roundAnalyticsManager.saveRoundAnalytics();
      }

      roundStateManager.setGamePhase(GamePhase.RUNNING);
      io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.RUNNING, {
        gamePhase: GamePhase.RUNNING,
      });

      console.log("Game Phase:", roundStateManager.getState().gamePhase);

      this.incrementMultiplier();
    } catch (err) {
      console.log("Failed to run the game", err);

      io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.ERROR, {
        message: "An error occurred on our end. We are working on it",
      });
    }
  }

  private incrementMultiplier = () => {
    const currentRoundState = roundStateManager.getState();

    const incrementValue =
      currentRoundState.currentMultiplier * GAME_CONFIG.MULTIPLIER_GROWTH_RATE;
    const newMultiplier = currentRoundState.currentMultiplier + incrementValue;
    const finalCrashPoint =
      currentRoundState.provablyFairOutcome?.finalMultiplier!;

    console.log(newMultiplier, finalCrashPoint);

    if (newMultiplier >= finalCrashPoint) {
      // Game ends
      bettingManager.openBettingWindow();
      roundStateManager.setGamePhase(GamePhase.BETTING);
      this.timeBeforeNextRound = this.BETTING_PERIOD;

      console.log("Game ended:", roundStateManager.getState().gamePhase);

      // Clear previous interval if any
      if (this.countdownIntervalId) {
        clearInterval(this.countdownIntervalId);
        this.countdownIntervalId = null;
      }

      this.countdownIntervalId = setInterval(() => {
        this.timeBeforeNextRound -= 0.1;

        if (this.timeBeforeNextRound <= 0) {
          if (this.countdownIntervalId) {
            clearInterval(this.countdownIntervalId);
            this.countdownIntervalId = null;
          }

          bettingManager.closeBettingWindow();
          console.log(bettingManager.getState());
          roundStateManager.reset();
          this.startGame();

          return;
        }

        io.emit(SOCKET_EVENTS.EMITTERS.BROADCAST_NEXT_GAME_COUNT_DOWN, {
          gamePhase: GamePhase.BETTING,
          countDown: Math.max(this.timeBeforeNextRound, 0),
        });
      }, 100);

      return;
    }

    roundStateManager.setCurrentMultiplier(newMultiplier);
    io.emit(SOCKET_EVENTS.EMITTERS.BROADCAST_CURRENT_MULTIPLIER, {
      gamePhase: GamePhase.RUNNING,
      multiplier: newMultiplier,
    });

    console.log("Game Phase:", roundStateManager.getState().gamePhase);

    setTimeout(() => {
      this.incrementMultiplier();
    }, 100);
  };
}

export const gameLifeCycleManager = GameLifeCycleManager.getInstance();
