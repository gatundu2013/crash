import express from "express";
import { connectDb } from "./db";
import { Server } from "socket.io";
import { createServer } from "http";
import { httpCorsOptions, socketIoConfig } from "./config/cors.config";
import cors from "cors";
import cookieParser from "cookie-parser";
import { gameLifeCycleManager } from "./services/game/gameEngine";
import { SERVER_CONFIG } from "./config/env.config";
import { SocketManager } from "./webSocket/socketManager";
import { userRouter } from "./routes/v1/user";
import { adminRouter } from "./routes/v1/admin";
import { gameRouter } from "./routes/v1/game";

const app = express();

app.use(cors(httpCorsOptions));
app.use(cookieParser());
app.use(express.json());

app.use("/api/v1/user", userRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/game", gameRouter);

const httpServer = createServer(app);
const io = new Server(httpServer, socketIoConfig);

async function startServer() {
  try {
    await connectDb(SERVER_CONFIG.MONGO_URL!);

    // Initialize socket connections
    const socketManager = new SocketManager(io);
    socketManager.initializeSocketConnection();

    gameLifeCycleManager.startGame(); // start game

    httpServer.listen(SERVER_CONFIG.PORT!, () => {
      console.log(`
      ################################################
       ✅ Server listening on port: ${SERVER_CONFIG.PORT} ✅
      ################################################
      `);
    });
  } catch (err) {
    console.error(err);
  }
}

export { startServer, httpServer, io };
