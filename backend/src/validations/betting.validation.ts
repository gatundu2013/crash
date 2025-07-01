import Joi from "joi";
import { BettingPayload, CashoutPayload } from "../types/backend/bet.types";
import { GAME_CONFIG } from "../config/env.config";

export const bettingSchema = Joi.object<BettingPayload, true>({
  stake: Joi.number()
    .required()
    .min(GAME_CONFIG.MIN_STAKE)
    .max(GAME_CONFIG.MAX_STAKE)
    .messages({
      "any.required": "Stake is required.",
      "number.base": "Stake must be a number.",
      "number.min": `Min stake KES ${GAME_CONFIG.MIN_STAKE}.`,
      "number.max": `Max stake KES ${GAME_CONFIG.MAX_STAKE}.`,
    }),

  autoCashoutMultiplier: Joi.number()
    .required()
    .min(GAME_CONFIG.MIN_MULTIPLIER)
    .allow(null)
    .messages({
      "any.required": "Auto cashout multiplier is required.",
      "number.base": "Auto cashout multiplier must be a number.",
      "number.min": `Auto cashout multiplier must be at least ${GAME_CONFIG.MIN_AUTO_CASHOUT_MULTIPLIER}.`,
    }),

  userId: Joi.string().required().messages({
    "any.required": "User ID is required.",
    "string.base": "User ID must be a string.",
  }),

  clientSeed: Joi.string().required().allow(null).messages({
    "any.required": "Client seed is required.",
    "string.base": "Client seed must be a string.",
  }),

  username: Joi.string().required().messages({
    "any.required": "Username is required.",
    "string.base": "Username must be a string.",
  }),

  storeId: Joi.string().required().messages({
    "any.required": "Store ID is required.",
    "string.base": "Store ID must be a string.",
  }),
});

export const cashoutSchema = Joi.object<CashoutPayload, true>({
  betId: Joi.string().trim().required().messages({
    "string.base": "betId must be a string.",
    "string.empty": "betId cannot be empty.",
    "any.required": "betId is required.",
  }),
});
