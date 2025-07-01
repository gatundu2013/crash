import User from "../../models/user.model";
import bcrypt from "bcrypt";
import { generateAuthTokens } from "../../utils/authTokens";
import { AuthError } from "../../utils/errors/authError";
import { formatUserData } from "../../utils/userFormatter";
import { AccountStatus } from "../../types/backend/userTypes";
import { v4 as uuidv4 } from "uuid";
import { LoginReq, RegisterReq } from "../../types/shared/api/authTypes";

export async function registerService(params: RegisterReq) {
  const { phoneNumber, username, password, agreeToTerms } = params;

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
    agreeToTerms,
    userId: uuidv4(),
  });

  const authTokens = generateAuthTokens({
    role: newUser.role,
    phoneNumber: newUser.phoneNumber,
    username: newUser.username,
    userId: newUser.userId,
  });

  const userData = formatUserData(newUser);

  return { authTokens, userData };
}

export async function loginService(params: LoginReq) {
  const { phoneNumber, password } = params;

  const user = await User.findOne({ phoneNumber }).lean();
  if (!user) {
    throw new AuthError({
      httpCode: 401,
      description: "Invalid credentials",
      isOperational: true,
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AuthError({
      httpCode: 401,
      description: "Invalid credentials",
      isOperational: true,
    });
  }

  const authTokens = generateAuthTokens({
    role: user.role,
    phoneNumber: user.phoneNumber,
    username: user.username,
    userId: user.userId,
  });

  const userData = formatUserData(user);

  return { authTokens, userData };
}

export async function getAuthStatusService(userId: string) {
  const user = await User.findOne({ userId: userId }).lean();

  if (user?.accountStatus !== AccountStatus.ACTIVE) {
    throw new AuthError({
      description: "This account is not active",
      httpCode: 403,
      isOperational: true,
    });
  }

  const userData = formatUserData(user);

  return { userData };
}
