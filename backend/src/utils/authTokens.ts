import jwt from "jsonwebtoken";
import { JwtPayloadI } from "../types/auth.types";

export async function generateAuthTokens(params: JwtPayloadI) {
  const accessToken = jwt.sign(params, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: "1d",
  });

  const refreshToken = jwt.sign(params, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: "30d",
  });

  return { accessToken, refreshToken };
}
