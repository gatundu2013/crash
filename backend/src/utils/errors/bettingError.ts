import { AppError, AppErrorI } from "./appError";

export class BettingError extends AppError {
  constructor(authError: AppErrorI) {
    super({ ...authError, name: "Betting Error" });
  }
}
