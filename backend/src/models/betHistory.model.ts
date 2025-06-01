import { Document, HydratedDocument, model, Schema } from "mongoose";
import { BetStatus, SingleBet } from "../types/bet.types";

interface BetHistoryDoc extends SingleBet, Document {
  finalMultiplier: number | null;
}

const betHistorySchema = new Schema<BetHistoryDoc>(
  {
    roundId: { type: String, required: true },
    userId: { type: String, required: true },
    stake: { type: Number, required: true },
    payout: { type: Number, default: null },
    cashoutMultiplier: { type: Number, default: null },
    finalMultiplier: { type: Number, default: null },
    autoCashoutMultiplier: { type: Number, default: null },
    status: { type: String, default: BetStatus.PENDING },
  },
  { timestamps: true }
);

const BetHistory = model<BetHistoryDoc>("BetHistory", betHistorySchema);

export default BetHistory;
