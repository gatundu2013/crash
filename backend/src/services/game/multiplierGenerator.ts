import crypto from "crypto";
import { GAME_CONFIG } from "../../config/game.config";

/**
 * Provably fair multiplier generator for gambling/gaming applications.
 * Uses client and server seeds to generate verifiable random multipliers.
 */
class MultiplierGenerator {
  private clientSeed: string;
  private serverSeed: string;
  private hashedServerSeed: string;
  private gameHash: string;
  private rawMultiplier: number;
  private finalMultiplier: number;

  /**
   * @param {Object} params - Constructor parameters
   * @param {string} params.clientSeed - Client-provided seed for randomness
   */
  constructor({ clientSeed }: { clientSeed: string }) {
    if (!GAME_CONFIG.CLIENT_SEED_REGEX.test(clientSeed)) {
      console.warn(
        `Invalid client seed provided: "${clientSeed}". Falling back to a random seed.`
      );
      this.clientSeed = GAME_CONFIG.DEFAULT_CLIENT_SEED;
    } else {
      this.clientSeed = clientSeed;
    }

    this.serverSeed = "";
    this.hashedServerSeed = "";
    this.gameHash = "";
    this.rawMultiplier = 0;
    this.finalMultiplier = 0;
  }

  /**
   * Generates a random server seed and its SHA256 hash
   * @private
   */
  private generateServerSeed() {
    this.serverSeed = crypto.randomBytes(32).toString("base64");
    this.hashedServerSeed = crypto
      .createHash("sha256")
      .update(this.serverSeed)
      .digest("hex");
  }

  /**
   * Creates a combined hash from server and client seeds
   * @private
   */
  private generateGameHash() {
    const combinedSeeds = `${this.serverSeed}${this.clientSeed}`;
    this.gameHash = crypto
      .createHash("sha256")
      .update(combinedSeeds)
      .digest("hex");
  }

  /**
   * Calculates multiplier from hash: converts hex to decimal, normalizes to 0-1,
   * inverts for multiplier, applies house edge, and enforces min/max bounds
   * @private
   */
  private calculateMultiplier() {
    // Get configuration values for multiplier calculation
    const { HEX_LENGTH, MIN_MULTIPLIER, MAX_MULTIPLIER, HOUSE_EDGE } =
      GAME_CONFIG;

    // Extract first N hex characters from game hash
    const hashPrefix = this.gameHash.slice(0, HEX_LENGTH);

    // Calculate maximum possible value for the hex length
    const numOfBytes = HEX_LENGTH / 2;
    const totalBits = numOfBytes * 8;
    const maxValue = Math.pow(2, totalBits) - 1;

    // Convert hex string to decimal number
    const hashPrefixInDecimal = parseInt(hashPrefix, 16);
    // Ensure we never divide by zero when calculating the multiplier
    const safeHashValue = Math.max(hashPrefixInDecimal, 1);

    // Normalize hash value to range 0-1
    const normalizedValue = safeHashValue / maxValue;

    // Invert normalized value to create multiplier (smaller hash = higher multiplier)
    const rawMultiplier = 1 / normalizedValue;
    // Apply house edge percentage to reduce multiplier
    const multiplierWithHouseEdge = (1 - HOUSE_EDGE) * rawMultiplier;

    // Ensure multiplier is within configured bounds
    let finalMultiplier = Math.max(MIN_MULTIPLIER, multiplierWithHouseEdge);
    finalMultiplier = Math.min(MAX_MULTIPLIER, finalMultiplier);

    // Store results rounded to 2 decimal places
    this.rawMultiplier = parseFloat(rawMultiplier.toFixed(2));
    this.finalMultiplier = parseFloat(finalMultiplier.toFixed(2));
  }

  /**
   * Generates complete game results with all seeds and multipliers
   * @returns {Object} Game result containing seeds, hash, and multipliers
   */
  public generateGameResults() {
    this.generateServerSeed();
    this.generateGameHash();
    this.calculateMultiplier();

    return {
      clientSeed: this.clientSeed,
      serverSeed: this.serverSeed,
      hashedServerSeed: this.hashedServerSeed,
      gameHash: this.gameHash,
      rawMultiplier: this.rawMultiplier,
      finalMultiplier: this.finalMultiplier,
    };
  }
}

export { MultiplierGenerator };
