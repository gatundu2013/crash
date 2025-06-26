import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JwtPayloadI } from "../types/auth.types";
import { JWT_CONFIG } from "../config/env.config";

export function verifyJwt(req: Request, res: Response, next: NextFunction) {
  try {
    const accessToken = req.cookies["accessToken"];

    if (!accessToken) {
      throw new Error("Missing token");
    }

    const userData = jwt.verify(
      accessToken,
      JWT_CONFIG.ACCESS_SECRET
    ) as JwtPayloadI;

    req.user = userData;

    next();
  } catch (err) {
    res.status(401).json({ message: "Unauthorized", error: err });
  }
}
