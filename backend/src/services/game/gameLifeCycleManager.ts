import { io } from "../../app";
import { GAME_CONFIG } from "../../config/game.config";
import { SOCKET_EVENTS } from "../../config/socketEvents.config";
import { GamePhase } from "../../types/game.types";
import { bettingManager } from "../betting/bettingManager";
import { cashoutManager } from "../betting/cashoutManager";
import RoundAnalyticsManager from "./roundAnalyticsManager";
import { roundStateManager } from "./roundStateManager";

const roundAnalyticsManager = new RoundAnalyticsManager();

/**
 * GameLifeCycleManager - Orchestrates the complete game round lifecycle
 * =====================
 *
 * This singleton class manages the entire flow of the game:
 * 1. Betting Phase: Players place bets during a timed window
 * 2. Preparing Phase: System generates round outcome and save them to db
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

  // Singleton pattern
  public static getInstance() {
    if (!GameLifeCycleManager.instance) {
      GameLifeCycleManager.instance = new GameLifeCycleManager();
    }

    return GameLifeCycleManager.instance;
  }

  /**
   * Initiates a new game round with proper sequence of operations
   * 1. Closes betting window and waits for processing bets to finish
   * 2. Generates provably fair outcome for the round
   * 3. Saves analytics data if bets were placed
   * 4. Starts the multiplier increment cycle
   */
  public async startGame() {
    try {
      // Close betting window - no more bets are accepted for current round
      bettingManager.closeBettingWindow();
      roundStateManager.setGamePhase(GamePhase.PREPARING);

      // Generate the predetermined crash point for this round
      roundStateManager.generateProvablyFairOutcome();
      const roundState = roundStateManager.getState();

      // notify all clients
      io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.PREPARING, {
        serverSeed: roundState.provablyFairOutcome?.hashedServerSeed!,
      });

      while (
        bettingManager.getState().isProcessing ||
        bettingManager.getState().stagedBetsCount > 0
      ) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Wait for any pending bet processing to complete before proceeding
      // This ensures data integrity
      while (bettingManager.getState().isProcessing) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Persist round data to database if any bets were placed
      if (roundState.activeBets.size > 0) {
        await roundAnalyticsManager.saveCompleteRoundResultsWithRetries({
          roundId: roundState.roundId!,
          totalPlayers: roundState.activeBets.size,
          roundPhase: roundState.gamePhase!,
          provablyFairOutcome: roundState.provablyFairOutcome!,
          financial: {
            houseProfit: 0,
            totalBetAmount: roundState.totalBetAmount,
            totalCashoutAmount: 0,
          },
        });
      }

      // Transition to running phase and notify all clients
      roundStateManager.setGamePhase(GamePhase.RUNNING);
      cashoutManager.openCashoutWindow();

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

    // AutoCashout
    cashoutManager.autoCashout();

    // Check if we've reached or exceeded the crash point
    if (newMultiplier >= finalCrashPoint) {
      this.handleRoundEnd();
      return;
    }

    // Update game state with new multiplier value
    roundStateManager.setCurrentMultiplier(newMultiplier);

    // Broadcast current multiplier to all connected clients
    io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.RUNNING, {
      currentMultiplier: newMultiplier,
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
  private async handleRoundEnd() {
    // Clean up multiplier increment timer to prevent memory leaks
    if (this.multiplierTimeoutId) {
      clearTimeout(this.multiplierTimeoutId);
      this.multiplierTimeoutId = null;
    }

    cashoutManager.closeCashoutWindow();

    // Notify all clients that the round has crashed/ended
    io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.END, {
      finalCrashPoint:
        roundStateManager.getState().provablyFairOutcome?.finalMultiplier,
    });

    if (roundStateManager.getState().activeBets.size > 0) {
      //Wait for all cashouts to complete
      while (
        cashoutManager.getState().isProcessing ||
        cashoutManager.getState().stagedCount > 0
      ) {
        console.log(
          `[GameLifeCycleManager]: Waiting for cashouts to complete--${
            cashoutManager.getState().stagedCount
          }`
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Bust all bets that were not cashedout
      await bettingManager.bustUncashedBets({
        roundId: roundStateManager.getState().roundId!,
        finalMultiplier:
          roundStateManager.getState().provablyFairOutcome?.finalMultiplier!,
      });
    }

    //Done for better UI rendering
    //Without this the UI would snap to the next phase
    // User would not be able to see the final multplier
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Reset game state for the next round
    const roundId = roundStateManager.reset();

    // Open betting window for next round
    bettingManager.openBettingWindow(roundId);
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
      io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.BETTING, {
        countDown: remaining,
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
