export enum Role {
  ADMIN = "admin",
  USER = "user",
}

export enum AccountStatus {
  ACTIVE = "active",
}

export interface UserI {
  username: string;
  password: string;
  phoneNumber: string;
  accountBalance: number;
  avatar: string;
  accountStatus: AccountStatus;
  role: Role;
  agreeToTerms: boolean;
}
