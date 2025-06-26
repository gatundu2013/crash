import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { GameConfig } from "../types/game.types";

// Load the appropriate .env file
const env = process.env.NODE_ENV || "development";
const envFile = `.env.${env}`;
const envPath = path.join(__dirname, "..", "..", envFile);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`✅ Loaded environment from ${envPath}`);
} else {
  console.log(
    `⚠️ Skipping dotenv. Using environment variables from process.env`
  );
}

// Helper to enforce required env vars
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(`❌ Missing required environment variable: ${name}`);
  return value;
}

// ----------- Grouped Configuration -----------
export const SERVER_CONFIG = {
  MONGO_URL: requireEnv("MONGO_URL"),
  PORT: Number(requireEnv("PORT")),
} as const;

export const JWT_CONFIG = {
  ACCESS_SECRET: requireEnv("JWT_ACCESS_SECRET"),
  REFRESH_SECRET: requireEnv("JWT_REFRESH_SECRET"),
} as const;

export const GAME_CONFIG: GameConfig = {
  HEX_LENGTH: Number(requireEnv("HEX_LENGTH")),
  MIN_MULTIPLIER: Number(requireEnv("MIN_MULTIPLIER")),
  MAX_MULTIPLIER: Number(requireEnv("MAX_MULTIPLIER")),
  HOUSE_EDGE: Number(requireEnv("HOUSE_EDGE")),
  CLIENT_SEED_REGEX: new RegExp(requireEnv("CLIENT_SEED_REGEX")),
  DEFAULT_CLIENT_SEED: requireEnv("DEFAULT_CLIENT_SEED"),
  MULTIPLIER_GROWTH_RATE: Number(requireEnv("MULTIPLIER_GROWTH_RATE")),
  MIN_STAKE: Number(requireEnv("MIN_STAKE")),
  MAX_STAKE: Number(requireEnv("MAX_STAKE")),
  MAX_HOUSE_PAYOUT: Number(requireEnv("MAX_HOUSE_PAYOUT")),
  MIN_AUTO_CASHOUT_MULTIPLIER: Number(
    requireEnv("MIN_AUTO_CASHOUT_MULTIPLIER")
  ),
  MAX_CLIENT_SEEDS: Number(requireEnv("MAX_CLIENT_SEEDS")),
  MAX_TOP_STAKERS: Number(requireEnv("MAX_TOP_STAKERS")),
} as const;
