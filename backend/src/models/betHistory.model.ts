import { Document, model, Schema } from "mongoose";
import { SingleBet } from "../types/bet.types";

interface BetHistoryDoc extends SingleBet, Document {
  roundId: string;
  finalMultiplier: number | null;
}

const betHistorySchema = new Schema<BetHistoryDoc>(
  {
    roundId: { type: String, required: true },
    userId: { type: String, required: true },
    stake: { type: Number, required: true },

    // Allow nullable fields
    payout: { type: Number, default: null },
    cashoutMultiplier: { type: Number, default: null },
    finalMultiplier: { type: Number, default: null },

    autoCashoutMultiplier: { type: Number, required: true },
    status: { type: String, required: true },
  },
  { timestamps: true }
);

const BetHistory = model<BetHistoryDoc>("BetHistory", betHistorySchema);

export default BetHistory;
