import { GameState } from "./services/game/GameState";

const state = GameState.getInstance().generateRoundResults("dddd");

console.log(GameState.getInstance());
