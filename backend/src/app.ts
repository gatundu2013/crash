import express from "express";
import { connectDb } from "./db";
import { router } from "./routes/v1";
import { Server } from "socket.io";
import { createServer } from "http";
import { SocketManager } from "./services/socket/socketManager";
import { corsOptions } from "./config/cors.config";
import { ENV_VAR, loadEnvVar } from "./config/env.config";
import cors from "cors";
import cookieParser from "cookie-parser";

loadEnvVar();

const app = express();
app.use(cors(corsOptions));

// Add cookie-parser middleware
app.use(cookieParser());

app.use(express.json());

app.use("/api/v1", router);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

async function startServer() {
  try {
    await connectDb(ENV_VAR.MONGO_URL!);

    // Initialize socket connections
    const socketManager = new SocketManager(io);
    socketManager.initializeSocketConnection();

    httpServer.listen(ENV_VAR.PORT!, () => {
      console.log(`The server is running on port ${ENV_VAR.PORT}`);
    });
  } catch (err) {
    console.error(err);
  }
}

export { startServer, httpServer, io };
