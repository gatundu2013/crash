import { UserI } from "../types/user.types";

/**
 * Returns formatted user data for client responses
 */
export function formatUserData(user: UserI) {
  return {
    phoneNumber: user.phoneNumber,
    username: user.username,
    accountBalance: user.accountBalance,
    avatar: user.avatar,
  };
}
