import { startServer } from "./app";
import { gameLifeCycleManager } from "./services/game/gameLifeCycleManager";
import { runBettingStressTest } from "./test/stressBettingManager";

startServer();

gameLifeCycleManager.startGame();
