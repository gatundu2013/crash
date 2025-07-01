import { EventEmitter } from "events";

/**
 * Centralized event names for the game event system (bust, bets, cashouts, etc).
 * Import these to avoid typos and keep event names consistent across modules.
 */
export const EVENT_NAMES = {
  ACCEPTED_BETS: "acceptedBets",
  CASHOUTS_PROCESSED: "cashoutsProcessed",
};

export const eventBus = new EventEmitter();
