import {
  LoginRequest,
  RegisterRequest,
  RequestOtp,
  ResetPasswordRequest,
} from "../types/auth.types";

export async function registerUserService(params: RegisterRequest) {}

export async function loginUserService(params: LoginRequest) {}

export async function resetUserPasswordService(params: ResetPasswordRequest) {}

export async function requestOtpService(params: RequestOtp) {}
