import { Role } from "./user.types";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayloadI;
    }
  }
}

export interface JwtPayloadI {
  username: string;
  phoneNumber: string;
  userId: string;
  role: Role;
}

export interface RegisterRequest {
  username: string;
  phoneNumber: string;
  password: string;
  agreeToTerms: boolean;
}

export interface LoginRequest {
  phoneNumber: string;
  password: string;
}

export interface ResetPasswordRequest {
  phoneNumber: string;
  newPassword: string;
  otp: string;
}

export interface RequestOtp {
  phoneNumber: string;
  otpPurpose: OtpPurpose;
}

export enum OtpPurpose {
  REGISTRATION = "registration",
  PASSWORD_RESET = "passwordReset",
}
