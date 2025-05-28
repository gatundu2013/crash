import { Server, Socket } from "socket.io";

export class SocketManager {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  public initializeSocketConnection() {
    this.setupConnectionHandlers();
  }

  private setupConnectionHandlers() {
    this.io.on("connection", (socket: Socket) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }
}
