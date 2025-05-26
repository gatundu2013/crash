import { Response } from "express";
import { AppError } from "./errors/appError";

export function handleApiError(err: unknown, res: Response) {
  if (err instanceof AppError) {
    return res.status(err.httpCode).json({
      success: false,
      message: err.description,
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}
