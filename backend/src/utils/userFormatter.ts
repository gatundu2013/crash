import { UserI } from "../types/backend/userTypes";

/**
 * Returns formatted user data for client responses
 */
export function formatUserData(user: UserI) {
  return {
    phoneNumber: user.phoneNumber,
    username: user.username,
    accountBalance: user.accountBalance,
    avatar: user.avatar,
    userId: user.userId,
  };
}
