import {
  MultiplierGenerator,
  MultiplierStats,
} from "./services/game/multiplierGenerator";

const stats = new MultiplierStats();

stats.generateMultipliers(10000);

stats.calculateRangeDistribution();
