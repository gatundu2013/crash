import jwt from "jsonwebtoken";
import { Response } from "express";
import { JWT_CONFIG } from "../config/env.config";
import { JwtPayloadI } from "../types/backend/authTypes";

const accessTokenMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

export function generateAuthTokens(params: JwtPayloadI) {
  const accessToken = jwt.sign(params, JWT_CONFIG.ACCESS_SECRET, {
    expiresIn: "7d",
  });

  return { accessToken };
}

export function setCookies(tokens: { accessToken: string }, res: Response) {
  res.cookie("accessToken", tokens.accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: accessTokenMaxAge,
  });
}

export function clearCookies(res: Response) {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: accessTokenMaxAge,
  });
}
