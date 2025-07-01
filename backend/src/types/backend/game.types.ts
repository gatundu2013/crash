import { ClientSeedDetails } from "../shared/socketIo/gameTypes";

export interface GameConfig {
  HEX_LENGTH: number;
  MIN_MULTIPLIER: number;
  MAX_MULTIPLIER: number;
  HOUSE_EDGE: number;
  CLIENT_SEED_REGEX: RegExp;
  DEFAULT_CLIENT_SEED: string;
  MULTIPLIER_GROWTH_RATE: number;

  MIN_STAKE: number;
  MAX_STAKE: number;
  MAX_HOUSE_PAYOUT: number;

  MIN_AUTO_CASHOUT_MULTIPLIER: number;

  MAX_CLIENT_SEEDS: number;
  MAX_TOP_STAKERS: number;
}
