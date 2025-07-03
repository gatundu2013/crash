import { CorsOptions } from "cors";
import { ServerOptions } from "socket.io";

const allowedOrigins = [
  "http://localhost:5173",
  "https://apexx-gamma.vercel.app/",
];

// http cors
export const httpCorsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`${origin} is not allowed`));
    }
  },
  credentials: true,
};

// socket.io cors
export const socketIoConfig: Partial<ServerOptions> = {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
};
