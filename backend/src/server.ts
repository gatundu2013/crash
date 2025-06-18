import { startServer } from "./app";
import { gameLifeCycleManager } from "./services/game/gameLifeCycleManager";

startServer();

gameLifeCycleManager.startGame();
