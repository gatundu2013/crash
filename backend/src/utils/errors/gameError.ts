import { AppError, AppErrorI } from "./appError";

export class GameError extends AppError {
  constructor(gameError: AppErrorI) {
    super({ ...gameError, name: "Game Error" });
  }
}
