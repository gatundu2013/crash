import { GAME_CONFIG } from "@/config/game.config";

function generateClientSeed() {
  const uint8 = crypto.getRandomValues(
    new Uint8Array(GAME_CONFIG.MAX_SEED_LENGTH / 2)
  );

  return Array.from(uint8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default generateClientSeed;
