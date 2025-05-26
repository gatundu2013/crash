export interface AppErrorI {
  description: string;
  name?: string;
  isOperational: boolean;
  httpCode: number;
  internalMessage?: string;
}

export class AppError extends Error {
  public readonly isOperational: boolean;
  public readonly httpCode: number;
  public readonly description: string;
  public readonly internalMessage: string;

  constructor({
    name,
    description,
    isOperational,
    httpCode,
    internalMessage,
  }: AppErrorI) {
    super(description);

    this.name = name || "App error";
    this.httpCode = httpCode;
    this.isOperational = isOperational;
    this.description = description;
    this.internalMessage = internalMessage || "";
    Error.captureStackTrace(this, this.constructor);
  }
}
