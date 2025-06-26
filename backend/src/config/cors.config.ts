import { CorsOptions } from "cors";

export const allowedOrigins = ["http://localhost:5173"];

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`${origin} is not allowed`));
    }
  },
  credentials: true,
};
