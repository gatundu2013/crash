import { Request, Response } from "express";
import { fetchBetHistorySchema } from "../../validations/betHistory.validation";
import { AppError } from "../../utils/errors/appError";
import { getPaginatedBetHistoryService } from "../../services/user/betHistoryService";
import { handleApiError } from "../../utils/apiErrorHandler";

export async function getPaginatedBetHistoryController(
  req: Request,
  res: Response
) {
  try {
    const userId = req.query.userId as string;
    let page = parseInt(req.query.page as string, 10);
    page = page <= 0 ? 1 : page;

    const { error, value } = fetchBetHistorySchema.validate({ userId, page });

    if (error) {
      throw new AppError({
        httpCode: 400,
        description: "Invalid query parameters",
        isOperational: true,
        internalMessage: error.message,
      });
    }

    const betHistories = await getPaginatedBetHistoryService(value);

    res.status(200).json(betHistories);
  } catch (err) {
    console.error("Fetch bet history error:", err);
    handleApiError(err, res);
  }
}
