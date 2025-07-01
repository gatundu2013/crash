import { Request, Response } from "express";
import {
  loginSchema,
  registerSchema,
  validateAuthPayload,
} from "../../validations/auth.validation";
import { handleApiError } from "../../utils/apiErrorHandler";
import { clearCookies, setCookies } from "../../utils/authTokens";
import {
  getAuthStatusService,
  loginService,
  registerService,
} from "../../services/user/authService";

export async function registerController(req: Request, res: Response) {
  try {
    const registerPayload = validateAuthPayload(registerSchema, req.body);

    const { authTokens, userData } = await registerService(registerPayload);

    setCookies(authTokens, res);

    res.status(201).json({
      status: true,
      user: userData,
    });
  } catch (err) {
    console.error(err);
    handleApiError(err, res);
  }
}

export async function loginController(req: Request, res: Response) {
  try {
    const loginPayload = validateAuthPayload(loginSchema, req.body);

    const { authTokens, userData } = await loginService(loginPayload);

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

export async function checkAuthStatusController(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;

    const { userData } = await getAuthStatusService(userId!);

    res.status(200).json({ success: true, user: userData });
  } catch (err) {
    console.log(err);
    handleApiError(err, res);
  }
}

export function logoutController(req: Request, res: Response) {
  clearCookies(res);
  res.status(200).json({ message: "Logged out" });
}
