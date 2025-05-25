import { GAME_CONFIG } from "../../config/game.config";
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
    /**
     * emit to all user that the game is in preparation phase - pending
     * generate round results - done
     * save roundAnalytics to the database - pending
     * start the game and emit to all users of game start - pending
     * **/

    // Generate round results
    const clientSeed = RoundStateManager.getInstance().getState().clientSeed;
    RoundStateManager.getInstance().generateRoundResults(clientSeed);

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
