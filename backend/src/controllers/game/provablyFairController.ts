import { Request, Response } from "express";
import { fetchProvablyFairResultsSchema } from "../../validations/betHistory.validation";
import { AppError } from "../../utils/errors/appError";
import { handleApiError } from "../../utils/apiErrorHandler";
import { getProvablyFairResultService } from "../../services/game/history/provablyfairService";

export async function getProvablyFairResultController(
  req: Request,
  res: Response
) {
  try {
    const roundId = req.params.roundId as string;

    const { error } = fetchProvablyFairResultsSchema.validate({ roundId });

    if (error) {
      throw new AppError({
        httpCode: 400,
        description: "Invalid path parameter",
        isOperational: true,
        internalMessage: error.message,
      });
    }

    const provablyResults = await getProvablyFairResultService(roundId);

    res.status(200).json({ ...provablyResults });
  } catch (err) {
    console.error("Failed to fetch provably fair results:", err);
    handleApiError(err, res);
  }
}
