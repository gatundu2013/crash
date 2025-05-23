export interface GameConfig {
  HEX_LENGTH: number;
  MIN_MULTIPLIER: number;
  MAX_MULTIPLIER: number;
  HOUSE_EDGE: number;
  CLIENT_SEED_REGEX: RegExp;
  DEFAULT_CLIENT_SEED: string;
}
