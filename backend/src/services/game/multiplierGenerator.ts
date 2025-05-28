import crypto from "crypto";
import { GAME_CONFIG } from "../../config/game.config";
import { ClientSeedDetails } from "../../types/game.types";

interface MultiplierGeneratorDep {
  clientSeed: string;
  clientSeedDetails: ClientSeedDetails[] | [];
}

/**
 * Provably fair multiplier generator for gambling/gaming applications.
 * Uses client and server seeds to generate verifiable random multipliers.
 */
class MultiplierGenerator {
  private clientSeedDetails: ClientSeedDetails[] | [];
  private clientSeed: null | string;
  private serverSeed: null | string;
  private hashedServerSeed: null | string;
  private gameHash: null | string;
  private rawMultiplier: null | number;
  private finalMultiplier: null | number;
  private decimal: null | number;

  /**
   * @param {Object} params - Constructor parameters
   * @param {string} params.clientSeed - Client-provided seed for randomness
   */
  constructor({ clientSeed, clientSeedDetails }: MultiplierGeneratorDep) {
    if (!GAME_CONFIG.CLIENT_SEED_REGEX.test(clientSeed)) {
      console.warn(
        `Invalid client seed provided: "${clientSeed}". Falling back to a random seed.`
      );
      this.clientSeed = GAME_CONFIG.DEFAULT_CLIENT_SEED;
      this.clientSeedDetails = [];
    } else {
      this.clientSeed = clientSeed;
      this.clientSeedDetails = clientSeedDetails;
    }

    this.serverSeed = null;
    this.hashedServerSeed = null;
    this.gameHash = null;
    this.rawMultiplier = null;
    this.finalMultiplier = null;
    this.decimal = null;
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
    const hashPrefix = this.gameHash!.slice(0, HEX_LENGTH);

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
    this.decimal = hashPrefixInDecimal;
    this.rawMultiplier = parseFloat(rawMultiplier.toFixed(2));
    this.finalMultiplier = parseFloat(finalMultiplier.toFixed(2));
  }

  /**
   * Generates complete game results with all seeds and multipliers
   * @returns {Object} Game result containing seeds, hash, and multipliers
   */
  public generateProvablyFairResults() {
    this.generateServerSeed();
    this.generateGameHash();
    this.calculateMultiplier();

    return {
      clientSeed: this.clientSeed,
      serverSeed: this.serverSeed,
      hashedServerSeed: this.hashedServerSeed,
      gameHash: this.gameHash,
      rawMultiplier: this.rawMultiplier,
      decimal: this.decimal,
      finalMultiplier: this.finalMultiplier,
      clientSeedDetails: this.clientSeedDetails,
    };
  }
}

class MultiplierStats {
  private multipliers: number[];

  static ranges = [
    { name: "1.00x - 1.99x", min: 1, max: 1.99 },
    { name: "2.00x - 2.99x", min: 2, max: 2.99 },
    { name: "3.00x - 4.99x", min: 3, max: 4.99 },
    { name: "5.00x - 9.99x", min: 5, max: 9.99 },
    { name: "10.00x - 19.99x", min: 10, max: 19.99 },
    { name: "20.00x - 49.99x", min: 20, max: 49.99 },
    { name: "50.00x - 99.99x", min: 50, max: 99.99 },
    { name: "100.00x - 499.99x", min: 100, max: 499.99 },
    { name: "500.00x - 999.99x", min: 500, max: 999.99 },
    { name: "1000.00x+", min: 1000, max: Infinity },
  ];

  constructor() {
    this.multipliers = [];
  }

  generateMultipliers(numOfRounds: number = 100) {
    this.multipliers = [];

    for (let i = 0; i < numOfRounds; i++) {
      const clientSeed = crypto.randomBytes(5).toString("hex");
      const generator = new MultiplierGenerator({
        clientSeed,
        clientSeedDetails: [],
      });

      this.multipliers.push(
        generator.generateProvablyFairResults().finalMultiplier!
      );
    }
  }

  calculateRangeDistribution() {
    const distribution: {
      [range: string]: { count: number; percentage: number };
    } = {};

    // Initialize the distribution with all ranges
    for (const range of MultiplierStats.ranges) {
      distribution[range.name] = { count: 0, percentage: 0 };
    }

    // Count occurrences in each range
    for (const multiplier of this.multipliers) {
      for (const range of MultiplierStats.ranges) {
        if (multiplier >= range.min && multiplier <= range.max) {
          distribution[range.name].count++;
          break;
        }
      }
    }

    // Calculate percentages
    const total = this.multipliers.length;
    for (const rangeName in distribution) {
      const entry = distribution[rangeName];
      entry.percentage =
        total > 0 ? parseFloat(((entry.count / total) * 100).toFixed(2)) : 0;
    }

    return distribution;
  }

  /**
   * Get a comprehensive statistical report
   * @returns Object containing all calculated statistics
   */
  public getStats() {
    return {
      count: this.multipliers.length,
      distribution: this.calculateRangeDistribution(),
    };
  }
}

export { MultiplierGenerator, MultiplierStats };
