import { UserI } from "../types/user.types";

/**
 * Returns formatted user data for client responses
 */
export function formatUserData(user: UserI | any) {
  return {
    phoneNumber: user.phoneNumber,
    username: user.username,
    accountBalance: user.accountBalance,
    avatar: user.avatar,
  };
}
