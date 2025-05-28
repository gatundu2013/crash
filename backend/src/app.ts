import express from "express";
import dotenv from "dotenv";
import { connectDb } from "./db";
import { router } from "./routes/v1";
import { Server } from "socket.io";
import { createServer } from "http";
import { SocketManager } from "./services/socket/socketManager";
import { GameLifeCycleManager } from "./services/game/gameLifeCyleManager";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
  },
});

app.use(express.json());

app.use("/api/v1", router);

async function startServer() {
  try {
    await connectDb(process.env.MONGO_URL!);

    // Initialize socket connections
    const socketManager = new SocketManager(io);
    socketManager.initializeSocketConnection();
    GameLifeCycleManager.getInstance().startGame();

    httpServer.listen(process.env.PORT!, () => {
      console.log("The server is running on port 4000");
    });
  } catch (err) {
    console.error(err);
  }
}

export { startServer, httpServer, io };
