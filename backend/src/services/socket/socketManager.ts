import { Server, Socket } from "socket.io";
import { bettingManager } from "../betting/bettingManager";
import { SOCKET_EVENTS } from "../../config/socketEvents.config";
import { BettingPayload, CashoutPayload } from "../../types/bet.types";
import { cashoutManager } from "../betting/cashoutManager";

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
      socket.on(
        SOCKET_EVENTS.LISTENERS.BETTING.PLACE_BET,
        (payload: BettingPayload) => bettingManager.stageBet(payload, socket)
      );
      socket.on(
        SOCKET_EVENTS.LISTENERS.BETTING.CASHOUT,
        (payload: CashoutPayload) =>
          cashoutManager.stageCashout({ payload, socket })
      );

      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }
}
