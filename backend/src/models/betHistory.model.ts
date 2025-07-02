import { Document, model, Schema } from "mongoose";
import { SingleBet } from "../types/backend/bet.types";

export interface BetHistoryI extends Omit<SingleBet, "criticalMultiplier"> {
  roundId: string;
  finalMultiplier: number | null;
  betId: string;
}

interface BetHistoryDoc extends BetHistoryI, Document {}

const betHistorySchema = new Schema<BetHistoryDoc>(
  {
    betId: { type: String, requred: true },
    roundId: { type: String, required: true },
    userId: { type: String, required: true },
    stake: { type: Number, required: true },

    // Allow nullable fields
    payout: { type: Number, default: null },
    cashoutMultiplier: { type: Number, default: null },
    finalMultiplier: { type: Number, default: null },

    autoCashoutMultiplier: { type: Number, default: null },
    status: { type: String, required: true },
  },
  { timestamps: true }
);

// Add compound indexes for better query performance
betHistorySchema.index({ roundId: 1, status: 1 }); // For querying uncashed bets
betHistorySchema.index({ userId: 1, betId: 1 }); // For user bet lookups
betHistorySchema.index({ status: 1, roundId: 1, userId: 1 }); // For active bets

const BetHistory = model<BetHistoryDoc>("BetHistory", betHistorySchema);

export default BetHistory;
