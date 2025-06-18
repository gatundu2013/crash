import { EventEmitter } from "events";

/**
 * Central event bus for decoupled communication between managers.
 * All events and payloads should be documented and (optionally) typed.
 */
/**
 * Centralized event names for the game event system (bust, bets, cashouts, etc).
 * Import these to avoid typos and keep event names consistent across modules.
 */
export const EVENT_NAMES = {
  ACCEPTED_BETS: "acceptedBets",
  CASHOUTS_PROCESSED: "cashoutsProcessed",
};

export const eventBus = new EventEmitter();
