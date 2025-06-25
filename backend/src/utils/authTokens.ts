import jwt from "jsonwebtoken";
import { JwtPayloadI } from "../types/auth.types";
import { Response } from "express";

const accessTokenMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

export function generateAuthTokens(params: JwtPayloadI) {
  const accessToken = jwt.sign(params, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: "7d",
  });

  return { accessToken };
}

export function setCookies(tokens: { accessToken: string }, res: Response) {
  res.cookie("accessToken", tokens.accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    maxAge: accessTokenMaxAge,
  });
}

export function clearCookies(res: Response) {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    maxAge: accessTokenMaxAge,
  });
}
