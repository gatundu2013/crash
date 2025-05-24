import { GameLifeCycle } from "./services/game/gameLifeCyle";
import { RoundStateManager } from "./services/game/roundStateManager";

const x = GameLifeCycle.getInstance();

GameLifeCycle.getInstance().startGame();
