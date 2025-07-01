/**
 * ........ ENUMS ..........
 *
 */
export enum OtpPurpose {
  REGISTRATION = "registration",
  PASSWORD_RESET = "passwordReset",
}

/*
 * ....... REQUESTS ..........
 */
export interface LoginReq {
  phoneNumber: string;
  password: string;
}

export interface RegisterReq {
  username: string;
  phoneNumber: string;
  password: string;
  agreeToTerms: boolean;
}

export interface ChangePasswordReq {
  phoneNumber: string;
  oldPassword: string;
  newPassword: string;
  otp: string;
}

export interface ResetPasswordReq {
  phoneNumber: string;
  password: string;
  otp: string;
}

export interface OtpReq {
  phoneNumber: string;
  otpPurpose: string;
}

/**
 * RESPONSE
 */
export interface AuthSuccessRes {
  success: true;
  userData: {
    phoneNumber: string;
    username: string;
    accountBalance: string;
    avatar: string;
    userId: string;
  };
}

export interface LogoutRes {
  message: string;
}
