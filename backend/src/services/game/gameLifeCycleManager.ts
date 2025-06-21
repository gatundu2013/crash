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
 * GameLifeCycleManager -- Singleton
 * ====================
 * Controls the game round life cycle:
 * 1. Betting phase — players place bets
 * 2. Preparing phase — generates crash point, waits for processing bet
 * 3. Running phase — multiplier rises, auto-cashouts happens
 * 4. End phase — bust all uncashed bets,calculates house profit,updates round analytics
 *
 *------ Cycle repeats------
 *
 * Emits real-time updates via Socket.IO.
 */
class GameLifeCycleManager {
  private static instance: GameLifeCycleManager;
  private isRunning = false;

  private readonly config = {
    bettingPhaseDurationSec: 5,
    countdownIntervalMs: 100, // counts down betting phase
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
   * Starts the continuous game loop
   */
  public async startGame(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    while (this.isRunning) {
      try {
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
   * Phase 1: Accept bets from players with countdown timer
   */
  private async handleBettingPhase(): Promise<void> {
    this.logPhaseStart(GamePhase.BETTING);
    const roundId = roundStateManager.reset();
    bettingManager.openBettingWindow(roundId);
    roundStateManager.setGamePhase(GamePhase.BETTING);

    const start = Date.now();
    let remaining = this.config.bettingPhaseDurationSec as number;

    // Countdown
    while (remaining > 0) {
      const now = Date.now();
      const elapsed = (now - start) / 1000;
      remaining = Math.max(this.config.bettingPhaseDurationSec - elapsed, 0);

      io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.BETTING, {
        countDown: +remaining.toFixed(1),
      });

      await this.sleep(this.config.countdownIntervalMs);
    }

    bettingManager.closeBettingWindow();
  }

  /**
   * Phase 2: Generate crash point and wait for all bets to process
   */
  private async handlePreparingPhase(): Promise<void> {
    this.logPhaseStart(GamePhase.PREPARING);
    roundStateManager.setGamePhase(GamePhase.PREPARING);

    io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.PREPARING, {
      gamePhase: GamePhase.PREPARING,
    });

    // Generate provably fair round results
    roundStateManager.generateProvablyFairOutcome();
    const { provablyFairOutcome } = roundStateManager.getState();

    io.emit(SOCKET_EVENTS.EMITTERS.BROADCAST_HASHED_SERVER_SEED, {
      hashedServerSeed: provablyFairOutcome!.hashedServerSeed,
    });

    // Wait for all staged bets to complete processing
    while (true) {
      const betState = bettingManager.getState();
      if (!betState.isProcessing && betState.stagedBetsCount === 0) break;
      console.log(
        `[GameLifeCycleManager]: Waiting for bets -- ${betState.stagedBetsCount}`
      );
      await this.sleep(500);
    }

    // Save round analytics if there are active bets
    const state = roundStateManager.getState();
    if (state.activeBets.size > 0) {
      await roundAnalyticsManager.saveCompleteRoundResultsWithRetries({
        roundId: state.roundId!,
        totalPlayers: state.activeBets.size,
        roundPhase: state.gamePhase!,
        provablyFairOutcome: state.provablyFairOutcome!,
        financial: {
          houseProfit: 0,
          totalBetAmount: state.totalBetAmount,
          totalCashoutAmount: 0,
        },
      });
    }
  }

  /**
   * Phase 3: Multiplier rises until crash point is reached
   */
  private async handleRunningPhase(): Promise<void> {
    this.logPhaseStart(GamePhase.RUNNING);
    roundStateManager.setGamePhase(GamePhase.RUNNING);
    cashoutManager.openCashoutWindow();

    // Multiplier growth loop
    while (true) {
      const state = roundStateManager.getState();
      const { currentMultiplier, provablyFairOutcome } = state;
      const crashPoint = provablyFairOutcome!.finalMultiplier;

      // Calculate next multiplier
      const increment = currentMultiplier * GAME_CONFIG.MULTIPLIER_GROWTH_RATE;
      const nextMultiplier = currentMultiplier + increment;

      // Process auto-cashout
      cashoutManager.autoCashout();

      // Check if we've reached the crash point
      if (nextMultiplier >= crashPoint!) break;

      // Update multiplier and broadcast to clients
      roundStateManager.setCurrentMultiplier(nextMultiplier);
      io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.RUNNING, {
        currentMultiplier: nextMultiplier,
      });

      await this.sleep(this.config.multiplierCountUpIntervalMs);
    }
  }

  /**
   * Phase 4: Process remaining cashouts and bust uncashed bets
   */
  private async handleEndPhase(): Promise<void> {
    this.logPhaseStart(GamePhase.END);
    cashoutManager.closeCashoutWindow();

    const crashPoint =
      roundStateManager.getState().provablyFairOutcome?.finalMultiplier!;

    io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.END, {
      finalCrashPoint: crashPoint,
    });

    // Wait for all pending cashouts to complete
    while (true) {
      const cashoutState = cashoutManager.getState();
      if (!cashoutState.isProcessing && cashoutState.stagedCount === 0) break;
      console.log(
        `[GameLifeCycleManager]: Waiting for cashouts -- ${cashoutState.stagedCount}`
      );
      await this.sleep(500);
    }

    // Bust all remaining uncashed bets and calculate round profit
    if (roundStateManager.getState().activeBets.size > 0) {
      const roundState = roundStateManager.getState();
      await roundAnalyticsManager.finalizeRoundOutcome({
        finalMultiplier: roundState.currentMultiplier,
        roundId: roundState.roundId!,
        totalBetAmount: roundState.totalBetAmount,
        totalCashoutAmount: roundState.totalCashoutAmount,
      });
    }

    // Brief pause for UI purposes -- show final multiplier before continuing
    await this.sleep(2500);
  }

  private handleLifecycleError(err: unknown): void {
    // Notify players of the issue
    io.emit(SOCKET_EVENTS.EMITTERS.GAME_PHASE.ERROR, {
      message:
        "An error occured on our end. Please wait while we resolve the issue.",
    });

    console.error("[GameLifeCycleManager]: CRITICAL ERROR - Game stopped", {
      error: err,
      timestamp: new Date().toISOString(),
      gameState: roundStateManager.getState(),
    });

    // Stop the game loop
    this.isRunning = false;
  }

  /**
   * manually stop the game loop
   */
  public stopGame(): void {
    this.isRunning = false;
  }

  private logPhaseStart(phase: GamePhase): void {
    console.log(`[GameLifeCycleManager]: Starting ${phase} phase`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const gameLifeCycleManager = GameLifeCycleManager.getInstance();
