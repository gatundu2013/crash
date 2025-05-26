import { AppError, AppErrorI } from "./appError";

export class AuthError extends AppError {
  constructor(authError: AppErrorI) {
    super({ ...authError, name: "Auth Error" });
  }
}
