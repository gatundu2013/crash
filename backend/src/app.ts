import express from "express";
import { connectDb } from "./db";
import { router } from "./routes/v1";
import { Server } from "socket.io";
import { createServer } from "http";
import { SocketManager } from "./services/socket/socketManager";
import { httpCorsOptions, socketIoConfig } from "./config/cors.config";
import { ENV_VAR } from "./config/env.config";
import cors from "cors";
import cookieParser from "cookie-parser";
import { gameLifeCycleManager } from "./services/game/gameLifeCycleManager";

const app = express();

app.use(cors(httpCorsOptions));
app.use(cookieParser());
app.use(express.json());
app.use("/api/v1", router);

const httpServer = createServer(app);
const io = new Server(httpServer, socketIoConfig);

async function startServer() {
  try {
    await connectDb(ENV_VAR.MONGO_URL!);

    // Initialize socket connections
    const socketManager = new SocketManager(io);
    socketManager.initializeSocketConnection();

    gameLifeCycleManager.startGame(); // start game

    httpServer.listen(ENV_VAR.PORT!, () => {
      console.log(`The server is running on port ${ENV_VAR.PORT}`);
    });
  } catch (err) {
    console.error(err);
  }
}

export { startServer, httpServer, io };
