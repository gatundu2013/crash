import Joi from "joi";
import { GetBetHistoryParams } from "../types/betHistory.types";

export const fetchBetHistorySchema = Joi.object<GetBetHistoryParams, true>({
  userId: Joi.string().required().messages({
    "any.required": "User ID is required.",
    "string.base": "User ID must be a string.",
    "string.empty": "User ID cannot be empty.",
  }),
  page: Joi.number().required().messages({
    "any.required": "Page is required.",
    "number.base": "Page must be a number.",
  }),
});
