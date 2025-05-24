import { GAME_CONFIG } from "../../config/game.config";
import { RoundStateManager } from "./roundStateManager";

export class GameLifeCycle {
  private static instance: GameLifeCycle;

  private constructor() {}

  public static getInstance() {
    if (!GameLifeCycle.instance) {
      GameLifeCycle.instance = new GameLifeCycle();
    }

    return GameLifeCycle.instance;
  }

  public startGame() {
    // Generate round results
    RoundStateManager.getInstance().generateRoundResults("InGodITrust");

    const roundStartTime = Date.now();
    this.incrementMultiplier(roundStartTime);
  }

  private incrementMultiplier = (roundStartTime: number) => {
    const roundStateManager = RoundStateManager.getInstance();
    const currentRoundState = roundStateManager.getState();

    const finalCrashPoint = currentRoundState.provablyFairOutcome?.finalMultiplier!;
    const timeElapsed = (Date.now() - roundStartTime) / 1000; //sec
    const currentMultiplier = Math.exp(GAME_CONFIG.MULTIPLIER_GROWTH_RATE * timeElapsed);

    if (currentMultiplier >= finalCrashPoint) {
      // End the round (crash occurred)
      console.log("crash occured");
      this.startGame();
      return;
    }

    roundStateManager.setCurrentMultiplier(currentMultiplier);

    console.log(currentMultiplier.toFixed(2)); // Displayed multiplier

    setTimeout(() => {
      this.incrementMultiplier(roundStartTime);
    }, 100);
  };
}
