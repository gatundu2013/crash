import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JwtPayloadI } from "../types/auth.types";
import { JWT_CONFIG } from "../config/env.config";
import { AuthError } from "../utils/errors/authError";
import { handleApiError } from "../utils/apiErrorHandler";

export function verifyJwt(req: Request, res: Response, next: NextFunction) {
  try {
    const accessToken = req.cookies["accessToken"];

    if (!accessToken) {
      throw new AuthError({
        description: "Unauthorized",
        httpCode: 401,
        isOperational: true,
        internalMessage: "Access token was not provided",
      });
    }

    const userData = jwt.verify(
      accessToken,
      JWT_CONFIG.ACCESS_SECRET
    ) as JwtPayloadI;

    req.user = userData;

    next();
  } catch (err) {
    handleApiError(err, res);
  }
}
