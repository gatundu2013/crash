import { handleApiError } from "../utils/apiErrorHandler";
import { Request, Response } from "express";
import { fetchBetHistorySchema } from "../validations/betHistory.validation";
import { AppError } from "../utils/errors/appError";
import { getPaginatedBetHistoryService } from "../services/betHistory";

export async function getPaginatedBetHistoryController(
  req: Request,
  res: Response
) {
  try {
    const userId = req.query.userId as string;
    const page = parseInt(req.query.page as string);

    const { error, value } = fetchBetHistorySchema.validate({ userId, page });

    if (error) {
      throw new AppError({
        description: "An error occured",
        httpCode: 400,
        isOperational: true,
        internalMessage: error.message,
      });
    }

    const betHistories = await getPaginatedBetHistoryService(value);

    res.status(200).json({ betHistories });
  } catch (err) {
    console.log("Fetch bet history error:", err);
    handleApiError(err, res);
  }
}
