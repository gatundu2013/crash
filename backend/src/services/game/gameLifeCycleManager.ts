import { io } from "../../app";
import { GAME_CONFIG } from "../../config/game.config";
import { SOCKET_EVENTS } from "../../config/socketEvents.config";
import { GamePhase } from "../../types/game.types";
import { bettingManager } from "../betting/bettingManager";
import RoundAnalyticsManager from "./roundAnalyticsManager";
import { roundStateManager } from "./roundStateManager";

const roundAnalyticsManager = new RoundAnalyticsManager();

/**
 * GameLifeCycleManager - Orchestrates the complete game round lifecycle
 * =====================
 *
 * This singleton class manages the entire flow of the game:
 * 1. Betting Phase: Players place bets during a timed window
 * 2. Preparing Phase: System generates outcomes and processes bets
 * 3. Running Phase: Multiplier increases until predetermined crash point
 * 4. End Phase: Round concludes, payouts processed, cycle repeats
 *
 * Key Dependencies:
 * - bettingManager: Controls betting window state and bet processing
 * - roundStateManager: Maintains current game state and round data
 * - roundAnalyticsManager: Persists game analytics to database
 * - io (Socket.IO): Real-time communication with connected clients
 *
 * Architecture Pattern: Singleton with event-driven lifecycle management
 */
class GameLifeCycleManager {
  private static instance: GameLifeCycleManager;

  // Game timing configuration constants
  private readonly BETTING_WINDOW = 5; // Duration of betting window in seconds
  private readonly COUNTDOWN_INTERVAL_MS = 100; // Frequency of countdown updates in milliseconds
  private readonly MULTIPLIER_INTERVAL_MS = 100; // Frequency of multiplier updates in milliseconds

  // Timer management - tracks active intervals/timeouts for cleanup
  private countdownIntervalId: NodeJS.Timeout | null = null; // Controls betting countdown timer
  private multiplierTimeoutId: NodeJS.Timeout | null = null; // Controls multiplier increment timer

  private constructor() {}

  /**
   * Singleton pattern implementation -- one instance of the game across the app
   */
  public static getInstance() {
    if (!GameLifeCycleManager.instance) {
      GameLifeCycleManager.instance = new GameLifeCycleManager();
    }

    return GameLifeCycleManager.instance;
  }

  /**
   * Initiates a new game round with proper sequence of operations
   * 1. Closes betting window and waits for pending bets
   * 2. Generates provably fair outcome for the round
   * 3. Saves analytics data if bets were placed
   * 4. Starts the multiplier increment cycle
   */
  public async startGame() {
    try {
      // Close betting window - no more bets are accepted for current round
      bettingManager.closeBettingWindow();

      // Transition to preparing phase and notify all clients
      roundStateManager.setGamePhase(GamePhase.PREPARING);
      io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.PREPARING, {
        gamePhase: GamePhase.PREPARING,
      });

      // Wait for any pending bet processing to complete before proceeding
      // This ensures data integrity
      while (bettingManager.getIsProcessing()) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Generate the predetermined crash point for this round
      roundStateManager.generateProvablyFairOutcome();

      // Persist round data to database if any bets were placed
      if (roundStateManager.getState().betsMap.size > 0) {
        await roundAnalyticsManager.saveRoundAnalyticsWithRetries();
      }

      // Transition to running phase and notify all clients
      roundStateManager.setGamePhase(GamePhase.RUNNING);
      io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.RUNNING, {
        gamePhase: GamePhase.RUNNING,
      });

      // Begin the multiplier increment cycle
      this.incrementMultiplier();
    } catch (err) {
      console.error("Failed to run the game", err);

      // Clean up any running timers to prevent orphaned processes
      this.clearAllSchedulers();

      // Notify clients of the error state
      io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.ERROR, {
        message: "An error occurred on our end. We are working on it",
      });
    }
  }

  /**
   * Continuously increments the game multiplier until the predetermined crash point
   * Uses exponential growth based on MULTIPLIER_GROWTH_RATE configuration
   * Recursively calls itself via setTimeout to create smooth multiplier progression
   */
  private incrementMultiplier() {
    const currentRoundState = roundStateManager.getState();
    const currentMultiplier = currentRoundState.currentMultiplier;

    // Calculate exponential growth increment (percentage of current multiplier)
    const incrementValue =
      currentMultiplier * GAME_CONFIG.MULTIPLIER_GROWTH_RATE;
    const newMultiplier = currentMultiplier + incrementValue;

    // Get the predetermined crash point for this round
    const finalCrashPoint =
      currentRoundState.provablyFairOutcome?.finalMultiplier!;

    // Check if we've reached or exceeded the crash point
    if (newMultiplier >= finalCrashPoint) {
      this.handleRoundEnd();
      return;
    }

    // Update game state with new multiplier value
    roundStateManager.setCurrentMultiplier(newMultiplier);

    // Broadcast current multiplier to all connected clients
    io.emit(SOCKET_EVENTS.EMITTERS.BROADCAST_CURRENT_MULTIPLIER, {
      gamePhase: GamePhase.RUNNING,
      multiplier: newMultiplier,
    });

    // Schedule next multiplier increment (creates smooth animation effect)
    this.multiplierTimeoutId = setTimeout(() => {
      this.incrementMultiplier();
    }, this.MULTIPLIER_INTERVAL_MS);
  }

  /**
   * Handles the end of a game round and prepares for the next round
   * 1. Cleans up multiplier timers
   * 2. Notifies clients of round end with final crash point
   * 3. Processes any remaining bets (busts uncashed bets)
   * 4. Resets game state and opens betting for next round
   */
  private handleRoundEnd() {
    // Clean up multiplier increment timer to prevent memory leaks
    if (this.multiplierTimeoutId) {
      clearTimeout(this.multiplierTimeoutId);
      this.multiplierTimeoutId = null;
    }

    // Notify all clients that the round has crashed/ended
    io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.END, {
      gamePhase: GamePhase.END,
      finalCrashPoint:
        roundStateManager.getState().provablyFairOutcome?.finalMultiplier,
    });

    // Process remaining bets - all uncashed bets are now busted
    // TODO: Add explicit bet processing logic here

    // Reset game state for the next round
    roundStateManager.reset();

    // Open betting window for next round
    bettingManager.openBettingWindow();
    roundStateManager.setGamePhase(GamePhase.BETTING);

    // Start countdown timer for next round's betting period
    this.startBettingCountdown();
  }

  /**
   * Manages the betting countdown period between rounds
   * Creates a real-time countdown that updates clients every 100ms
   * Automatically starts the next game when countdown reaches zero
   */
  private startBettingCountdown() {
    const start = Date.now();

    // Create interval that updates countdown every COUNTDOWN_INTERVAL_MS
    this.countdownIntervalId = setInterval(() => {
      // Calculate elapsed time and remaining betting time
      const elapsed = (Date.now() - start) / 1000;
      const remaining = Math.max(this.BETTING_WINDOW - elapsed, 0);

      // Broadcast countdown to all clients for real-time updates
      io.emit(SOCKET_EVENTS.EMITTERS.BROADCAST_NEXT_GAME_COUNT_DOWN, {
        gamePhase: GamePhase.BETTING,
        countDown: remaining,
      });

      // When countdown reaches zero, close betting and start next round
      if (remaining <= 0) {
        // Clean up countdown timer
        if (this.countdownIntervalId) {
          clearInterval(this.countdownIntervalId);
          this.countdownIntervalId = null;
        }

        // Close betting window and initiate next game round
        bettingManager.closeBettingWindow();
        this.startGame();
        return;
      }

      // Send additional countdown update with current game phase
      // This ensures clients stay synchronized with game state
      io.emit(SOCKET_EVENTS.EMITTERS.BROADCAST_NEXT_GAME_COUNT_DOWN, {
        countDown: remaining,
        gamePhase: roundStateManager.getState().gamePhase,
      });
    }, this.COUNTDOWN_INTERVAL_MS);
  }

  /**
   * Cleans up all active timers and intervals to prevent memory leaks
   * Called during error handling or when stopping the game lifecycle
   * Ensures no orphaned processes continue running in the background
   */
  private clearAllSchedulers() {
    // Clear betting countdown interval if active
    clearInterval(this.countdownIntervalId || "");

    // Clear multiplier increment timeout if active
    clearTimeout(this.multiplierTimeoutId || "");

    // Reset timer references to null for garbage collection
    this.countdownIntervalId = null;
    this.multiplierTimeoutId = null;
  }
}

export const gameLifeCycleManager = GameLifeCycleManager.getInstance();
