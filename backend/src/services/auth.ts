import User from "../models/user.model";
import {
  LoginRequest,
  RegisterRequest,
  RequestOtp,
  ResetPasswordRequest,
} from "../types/auth.types";
import bcrypt from "bcrypt";
import { generateAuthTokens } from "../utils/authTokens";
import { AuthError } from "../utils/errors/authError";

export async function registerUserService(params: RegisterRequest) {
  const { phoneNumber, username, password } = params;

  const phoneNumberExist = await User.findOne({ phoneNumber }).lean();

  if (phoneNumberExist) {
    throw new AuthError({
      httpCode: 409,
      description: "Phone number already exist",
      isOperational: true,
    });
  }

  const usernameExist = await User.findOne({ username }).lean();

  if (usernameExist) {
    throw new AuthError({
      httpCode: 409,
      description: "Username already exist",
      isOperational: true,
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    username,
    phoneNumber,
    password: hashedPassword,
  });

  const authTokens = generateAuthTokens({
    role: newUser.role,
    phoneNumber: newUser.phoneNumber,
    username: newUser.username,
    userId: newUser._id.toString(),
  });

  const userData = {
    phoneNumber,
    username,
    accountBalance: newUser.accountBalance,
    avatar: newUser.avatar,
  };

  return { authTokens, userData };
}

export async function loginUserService(params: LoginRequest) {}

export async function resetUserPasswordService(params: ResetPasswordRequest) {}

export async function requestOtpService(params: RequestOtp) {}
