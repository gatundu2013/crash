import { Schema, Document } from "mongoose";
import { RoundAnalyticsI } from "../types/backend/roundAnalytics.types";
import { model } from "mongoose";
import { ClientSeedDetails } from "../types/shared/socketIo/gameTypes";

export interface RoundAnalyticsDocument extends RoundAnalyticsI, Document {}

const ClientSeedDetailsSchema = new Schema<ClientSeedDetails>({
  seed: { type: String, required: true },
  username: { type: String, required: true },
});

const RoundAnalyticsSchema = new Schema<RoundAnalyticsDocument>(
  {
    roundId: {
      type: String,
      required: true,
      unique: true,
    },
    totalPlayers: {
      type: Number,
      required: true,
      default: 0,
    },
    roundCount: { type: Number, required: true },
    roundPhase: { type: String, required: true },
    provablyFairOutcome: {
      clientSeedDetails: {
        type: [ClientSeedDetailsSchema],
        default: [],
      },
      clientSeed: { type: String, default: null },
      serverSeed: { type: String, default: null },
      hashedServerSeed: { type: String, default: null },
      gameHash: { type: String, default: null },
      rawMultiplier: { type: Number, default: null },
      decimal: { type: Number, default: null },
      finalMultiplier: { type: Number, default: null },
    },
    financial: {
      totalBetAmount: {
        type: Number,
        required: true,
      },
      totalCashoutAmount: {
        type: Number,
        default: 0,
      },
      houseProfit: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true }
);

const RoundAnalyticsModel = model<RoundAnalyticsDocument>(
  "RoundAnalytics",
  RoundAnalyticsSchema
);

export default RoundAnalyticsModel;
