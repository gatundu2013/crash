export interface GameConfig {
  HEX_LENGTH: number;
  MIN_MULTIPLIER: number;
  MAX_MULTIPLIER: number;
  HOUSE_EDGE: number;
  CLIENT_SEED_REGEX: RegExp;
  DEFAULT_CLIENT_SEED: string;
  MULTIPLIER_GROWTH_RATE: number;
}

export interface GameResults {
  clientSeed: string | null;
  serverSeed: string | null;
  hashedServerSeed: string | null;
  gameHash: string | null;
  rawMultiplier: number | null;
  decimal: number | null;
  finalMultiplier: number | null;
}

export interface ClientSeedDetails {
  username: string;
  seed: string;
  userId: string;
}

export enum GamePhase {
  PREPARING = "preparing",
  RUNNING = "running",
  CRASHED = "crashed",
  BETTING = "betting",
  ERROR = "error",
}
