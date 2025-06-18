import { AppError, AppErrorI } from "./appError";

export class CashoutError extends AppError {
  constructor(cashoutError: AppErrorI) {
    super({ ...cashoutError, name: "Cashout Error" });
  }
}
