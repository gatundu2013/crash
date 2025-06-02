import { Request, Response } from "express";
import bettingSchema from "../validations/bet/betting.validation";
import { BettingError } from "../utils/errors/bettingError";
import { placeBetService } from "../services/betting/placeBet";
import { handleApiError } from "../utils/apiErrorHandler";

export async function placeBetController(req: Request, res: Response) {
  try {
    const { value, error } = bettingSchema.validate(req.body);

    if (error) {
      throw new BettingError({
        description: error.message,
        httpCode: 400,
        isOperational: true,
      });
    }

    const response = await placeBetService(value);

    res.status(200).json({
      success: response.success,
      newAccountBalance: response.newAccountBalance,
    });
  } catch (err) {
    console.error(err);

    handleApiError(err, res);
  }
}
