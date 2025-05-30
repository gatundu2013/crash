import { Request, Response } from "express";
import {
  getUserAuthStatus,
  loginUserService,
  registerUserService,
} from "../services/auth";
import {
  loginSchema,
  registerSchema,
  validateAuthPayload,
} from "../validations/auth.validation";
import { handleApiError } from "../utils/apiErrorHandler";
import { setCookies } from "../utils/authTokens";
import User from "../models/user.model";
import { AccountStatus } from "../types/user.types";
import { AuthError } from "../utils/errors/authError";
import { formatUserData } from "../utils/userFormatter";

export async function registerUserController(req: Request, res: Response) {
  try {
    const registerPayload = validateAuthPayload(registerSchema, req.body);

    console.log(registerPayload);

    const { authTokens, userData } = await registerUserService(registerPayload);

    setCookies(authTokens, res);

    res.status(201).json({
      success: true,
      user: userData,
    });
  } catch (err) {
    console.error(err);
    handleApiError(err, res);
  }
}

export async function loginUserController(req: Request, res: Response) {
  try {
    const loginPayload = validateAuthPayload(loginSchema, req.body);

    const { authTokens, userData } = await loginUserService(loginPayload);

    setCookies(authTokens, res);

    res.status(201).json({
      success: true,
      user: userData,
    });
  } catch (err) {
    console.error(err);
    handleApiError(err, res);
  }
}

export async function checkAuthStatus(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;

    const { userData } = await getUserAuthStatus(userId!);

    res.status(200).json({ success: true, user: userData });
  } catch (err) {
    console.log(err);
    handleApiError(err, res);
  }
}

export async function resetPasswordController(req: Request, res: Response) {}

export async function requestOtpController(req: Request, res: Response) {}
