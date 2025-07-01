import Joi from "joi";
import { GetBetHistoryParams } from "../types/shared/api/betHistory.types";

export const fetchBetHistorySchema = Joi.object<GetBetHistoryParams, true>({
  userId: Joi.string().required().messages({
    "any.required": "User Id is required.",
    "string.base": "User Id must be a string.",
    "string.empty": "User Id cannot be empty.",
  }),
  page: Joi.number().required().messages({
    "any.required": "Page is required.",
    "number.base": "Page must be a number.",
  }),
});

export const fetchProvablyFairResultsSchema = Joi.object({
  roundId: Joi.string().required().messages({
    "any.required": "Round Id is required.",
    "string.base": "Round Id must be a string.",
    "string.empty": "Round Id cannot be empty.",
  }),
});
