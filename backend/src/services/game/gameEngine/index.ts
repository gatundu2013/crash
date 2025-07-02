import { io } from "../../../app";
import { GAME_CONFIG } from "../../../config/env.config";
import { SOCKET_EVENTS } from "../../../config/socketEvents.config";
import {
  BettingPhaseRes,
  EndPhaseRes,
  GamePhase,
  GamePhaseErrorRes,
  PreparingPhaseRes,
  RunningPhaseRes,
} from "../../../types/shared/socketIo/gameTypes";
import { toFixedDecimals } from "../../../utils/toFixedDecimals";
import { bettingManager } from "./bettingManager";
import { cashoutManager } from "./cashoutManager";
import RoundoutcomeManager from "./roundOutcomeManager";
import { roundStateManager } from "./roundStateManager";

// Handles saving round analytics to database and round profit calculation
const roundOutcomeManager = new RoundoutcomeManager();

/**
 * This class manages the complete game-round lifecyle.
 *
 * Game Flow Overview:
 * 1. BETTING PHASE   - Players place bets with a countdown timer
 * 2. PREPARING PHASE - Generate provably fair crash point and process pending bets
 * 3. RUNNING PHASE   - Multiplier increases until crash point is reached
 * 4. END PHASE       - Wait for processing cashouts, bust remaining bets, calculate profits
 *
 * The cycle then repeats.
 */
class GameLifeCycleManager {
  private static instance: GameLifeCycleManager;

  private isRunning = false;

  private readonly config = {
    bettingPhaseDurationSec: 5,
    countdownIntervalMs: 100,
    multiplierCountUpIntervalMs: 100,
  } as const;

  private constructor() {}

  public static getInstance(): GameLifeCycleManager {
    if (!GameLifeCycleManager.instance) {
      GameLifeCycleManager.instance = new GameLifeCycleManager();
    }
    return GameLifeCycleManager.instance;
  }

  /**
   * This is the main entry point that begins the infinite game cycle.
   */
  public async startGame(): Promise<void> {
    // Prevent multiple game loops from running simultaneously
    if (this.isRunning) {
      console.warn("Game loop is already running");
      return;
    }

    this.isRunning = true;

    // Main game loop - continues until manually stopped
    while (this.isRunning) {
      try {
        // Execute all four phases in sequence
        await this.handleBettingPhase();
        await this.handlePreparingPhase();
        await this.handleRunningPhase();
        await this.handleEndPhase();
      } catch (err) {
        this.handleLifecycleError(err);
      }
    }
  }

  /**
   * PHASE 1: BETTING PHASE
   * ======================
   *
   * During this phase:
   * - Players can place bets
   * - A countdown timer shows remaining time
   * - Real-time updates are sent to all clients
   * - Betting window closes when time expires
   */
  private async handleBettingPhase(): Promise<void> {
    // Reset round state and get new round ID
    const roundId = roundStateManager.reset();
    io.emit(SOCKET_EVENTS.EMITTERS.RESET_LIVE_STATS);

    // Open betting window to accept new bets
    bettingManager.openBettingWindow(roundId);

    // Update game phase state
    roundStateManager.setGamePhase(GamePhase.BETTING);

    // Initialize countdown timer
    const start = Date.now();
    let remaining = this.config.bettingPhaseDurationSec as number;

    // Countdown loop - updates clients with remaining time
    while (remaining > 0) {
      const now = Date.now();
      const elapsed = (now - start) / 1000;
      remaining = Math.max(this.config.bettingPhaseDurationSec - elapsed, 0);

      // Broadcast current countdown to all connected clients
      io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.BETTING, {
        countDown: +remaining.toFixed(1),
        gamePhase: GamePhase.BETTING,
      } satisfies BettingPhaseRes);

      // Wait before next countdown update
      await this.sleep(this.config.countdownIntervalMs);
    }

    // Time's up - close betting window to reject new bets
    bettingManager.closeBettingWindow();
  }

  /**
   * PHASE 2: PREPARING PHASE
   * ========================
   *
   * During this phase:
   * - Generate provably fair crash point using cryptographic methods
   * - Broadcast hashed server seed for transparency
   * - Wait for all pending bets to finish processing
   * - Save initial round data to database
   */
  private async handlePreparingPhase(): Promise<void> {
    roundStateManager.setGamePhase(GamePhase.PREPARING);

    // Generate provably fair crash point
    roundStateManager.generateProvablyFairOutcome();
    const { provablyFairOutcome } = roundStateManager.getState();

    // Notify clients that we're preparing the round
    io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.PREPARING, {
      gamePhase: GamePhase.PREPARING,
      hashedServerSeed: provablyFairOutcome!.hashedServerSeed!,
    } satisfies PreparingPhaseRes);

    // Wait for all staged bets to complete processing
    // This ensures all bets are properly saved before the game starts
    while (true) {
      const betState = bettingManager.getState();
      if (!betState.isProcessing && betState.stagedBetsCount === 0) break;

      console.info(
        `[GameLifeCycleManager]: Bets are still processing -- ${betState.stagedBetsCount}`
      );
      await this.sleep(500);
    }

    // Save initial round analytics if there are active bets
    const state = roundStateManager.getState();
    if (state.activeBets.size > 0) {
      await roundOutcomeManager.saveCompleteRoundResultsWithRetries({
        roundId: state.roundId!,
        totalPlayers: state.activeBets.size,
        roundPhase: state.gamePhase!,
        provablyFairOutcome: state.provablyFairOutcome!,
        roundCount: 0,
        financial: {
          houseProfit: 0,
          totalBetAmount: state.totalBetAmount,
          totalCashoutAmount: 0,
        },
      });
    }
  }

  /**
   * PHASE 3: RUNNING PHASE
   * ======================
   *
   * During this phase:
   * - Multiplier increases exponentially over time
   * - Players can cash out their bets
   * - Auto-cashout triggers for players who set limits
   * - Continues until crash point is reached
   */
  private async handleRunningPhase(): Promise<void> {
    roundStateManager.setGamePhase(GamePhase.RUNNING);

    // Open cashout window to accept cashout requests
    cashoutManager.openCashoutWindow();

    // Multiplier growth loop - continues until crash point
    while (true) {
      const state = roundStateManager.getState();
      const { currentMultiplier, provablyFairOutcome } = state;
      const crashPoint = provablyFairOutcome!.finalMultiplier;

      // Calculate next multiplier using exponential growth
      const increment = currentMultiplier * GAME_CONFIG.MULTIPLIER_GROWTH_RATE;
      const nextMultiplier = currentMultiplier + increment;

      // Process bets whose auto-cashout condition is meet
      // This happens before checking crash point to ensure fairness
      cashoutManager.autoCashout();

      // Check if we've reached or exceeded the crash point
      if (nextMultiplier >= crashPoint!) break;

      // Update multiplier state and broadcast to all clients
      roundStateManager.setCurrentMultiplier(nextMultiplier);
      io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.RUNNING, {
        currentMultiplier: +toFixedDecimals(nextMultiplier),
        gamePhase: GamePhase.RUNNING,
      } satisfies RunningPhaseRes);

      // Wait before next multiplier update (controls game speed)
      await this.sleep(this.config.multiplierCountUpIntervalMs);
    }
  }

  /**
   * PHASE 4: END PHASE
   * ==================
   *
   * During this phase:
   * - Game crashes at predetermined point
   * - Process pending cashouts
   * - Bust all remaining uncashed bets
   * - Calculate house profit and update analytics
   * - Brief pause before next round -- Why? Better user exprience
   */
  private async handleEndPhase(): Promise<void> {
    roundStateManager.setGamePhase(GamePhase.END);

    // Close cashout window - no more cashouts allowed
    cashoutManager.closeCashoutWindow();

    const { roundId, provablyFairOutcome } = roundStateManager.getState();

    // Update previous multipliers history for display
    roundStateManager.updatePreviousMultipliers({
      finalMultiplier: +toFixedDecimals(provablyFairOutcome?.finalMultiplier!),
      roundId: roundId!,
    });

    // Broadcast final crash multiplier to all clients
    io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.END, {
      finalMultiplier: +toFixedDecimals(provablyFairOutcome?.finalMultiplier!),
      roundId: roundId!,
      gamePhase: GamePhase.END,
    } satisfies EndPhaseRes);

    // Wait for all pending cashouts to complete processing
    // This ensures all cashouts are properly handled before finalizing
    while (true) {
      const cashoutState = cashoutManager.getState();
      if (!cashoutState.isProcessing && cashoutState.stagedCount === 0) break;

      console.log(
        `[GameLifeCycleManager]: Waiting for cashouts -- ${cashoutState.stagedCount}`
      );
      await this.sleep(500);
    }

    // Finalize round outcome - bust remaining bets and calculate house profits
    if (roundStateManager.getState().activeBets.size > 0) {
      const roundState = roundStateManager.getState();
      await roundOutcomeManager.finalizeRoundOutcome({
        finalMultiplier: roundState.currentMultiplier,
        roundId: roundState.roundId!,
        totalBetAmount: roundState.totalBetAmount,
        totalCashoutAmount: roundState.totalCashoutAmount,
      });
    }

    // Brief pause for UI purposes - allows players to see final result
    await this.sleep(2500);
  }

  /**
   * Error Handler
   * =============
   *
   * Handles any errors that occur during the game lifecycle:
   * - Notifies all players of the issue
   * - Logs detailed error information
   * - Safely stops the game loop
   */
  private handleLifecycleError(err: unknown): void {
    // Notify all connected players of the error
    io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.ERROR, {
      message: "An error occured on our end. We are working on it.",
      gamePhase: GamePhase.ERROR,
    } satisfies GamePhaseErrorRes);

    console.error("[GameLifeCycleManager]: CRITICAL ERROR - Game stopped", {
      error: err,
      timestamp: new Date().toISOString(),
      gameState: roundStateManager.getState(),
    });

    // Stop the game loop to prevent further errors
    this.isRunning = false;
  }

  /**
   * Manually stop the game loop
   *
   * Can be called to gracefully stop the game (e.g., for maintenance)
   */
  public stopGame(): void {
    this.isRunning = false;
  }

  /**
   * Utility method to create delays
   *
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after the specified time
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const gameLifeCycleManager = GameLifeCycleManager.getInstance();
