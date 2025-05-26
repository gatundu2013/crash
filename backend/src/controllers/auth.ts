import { Request, Response } from "express";
import { loginUserService, registerUserService } from "../services/auth";
import {
  loginSchema,
  registerSchema,
  validateAuthPayload,
} from "../validations/auth.validation";
import { handleApiError } from "../utils/apiErrorHandler";

export async function registerUserController(req: Request, res: Response) {
  try {
    const registerPayload = validateAuthPayload(registerSchema, req.body);

    const { authTokens, userData } = await registerUserService(registerPayload);

    return res.status(201).json({
      success: true,
      message: "Registered successfully",
      data: {
        user: userData,
        tokens: authTokens,
      },
    });
  } catch (err) {
    handleApiError(err, res);
  }
}

export async function loginUserController(req: Request, res: Response) {
  try {
    const loginPayload = validateAuthPayload(loginSchema, req.body);

    const { authTokens, userData } = await loginUserService(loginPayload);

    return res.status(200).json({
      success: true,
      message: "Logged in successfully",
      data: {
        user: userData,
        tokens: authTokens,
      },
    });
  } catch (err) {
    handleApiError(err, res);
  }
}

export async function resetPasswordController(req: Request, res: Response) {}

export async function requestOtpController(req: Request, res: Response) {}
