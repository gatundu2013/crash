import { Role } from "./userTypes";

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
