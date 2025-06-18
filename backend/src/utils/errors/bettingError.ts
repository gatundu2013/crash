import { AppError, AppErrorI } from "./appError";

export class BettingError extends AppError {
  constructor(betError: AppErrorI) {
    super({ ...betError, name: "Betting Error" });
  }
}
