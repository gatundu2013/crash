import { GameConfig } from "../types/game.types";

export const GAME_CONFIG: GameConfig = {
  HEX_LENGTH: 13,
  MIN_MULTIPLIER: 1,
  MAX_MULTIPLIER: 3102,
  HOUSE_EDGE: 0.03, // 3%
  CLIENT_SEED_REGEX: /^[a-zA-Z0-9]{6,}$/, // Only letters and numbers, minimum 6 characters
  DEFAULT_CLIENT_SEED: "actionAndSelfDiscipline", // Fallback client seed if invalid
};
