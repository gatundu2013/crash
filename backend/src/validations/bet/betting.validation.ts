import Joi from "joi";
import { BettingPayload } from "../../types/bet.types";
import { GAME_CONFIG } from "../../config/game.config";

const bettingSchema = Joi.object<BettingPayload>({
  stake: Joi.number()
    .required()
    .greater(0)
    .min(GAME_CONFIG.MIN_STAKE)
    .max(GAME_CONFIG.MAX_STAKE)
    .messages({
      "any.required": "Stake is required.",
      "number.base": "Stake must be a number.",
      "number.greater": "Stake must be greater than 0.",
      "number.min": `Stake must be at least ${GAME_CONFIG.MIN_STAKE}.`,
      "number.max": `Stake must not exceed ${GAME_CONFIG.MAX_STAKE}.`,
    }),

  userId: Joi.string().required().messages({
    "any.required": "User ID is required.",
    "string.base": "User ID must be a string.",
  }),

  autoCashoutMultiplier: Joi.number()
    .required()
    .greater(0)
    .min(GAME_CONFIG.MIN_MULTIPLIER)
    .messages({
      "any.required": "Auto cashout multiplier is required.",
      "number.base": "Auto cashout multiplier must be a number.",
      "number.greater": "Auto cashout multiplier must be greater than 0.",
      "number.min": `Auto cashout multiplier must be at least ${GAME_CONFIG.MIN_MULTIPLIER}.`,
    }),
});

export default bettingSchema;
