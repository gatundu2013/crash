import { Server, Socket } from "socket.io";
import {
  BettingPayload,
  CashoutPayload,
} from "../types/shared/socketIo/betTypes";
import { SOCKET_EVENTS } from "../config/socketEvents.config";
import { bettingManager } from "../services/game/gameEngine/bettingManager";
import { cashoutManager } from "../services/game/gameEngine/cashoutManager";
import { roundStateManager } from "../services/game/gameEngine/roundStateManager";
import { OnConnectRes } from "../types/shared/socketIo/gameTypes";

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
        (payload: BettingPayload) =>
          bettingManager.stageBet({ payload, socket })
      );

      socket.on(
        SOCKET_EVENTS.LISTENERS.BETTING.CASHOUT,
        (payload: CashoutPayload) =>
          cashoutManager.stageCashout({
            payload,
            socket,
            isFromAutoCashout: false,
            autoCashoutMultiplier: null,
          })
      );

      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
      });

      socket.emit(SOCKET_EVENTS.EMITTERS.ON_CONNECT_DATA, {
        topStakers: roundStateManager.getState().topStakers,
        previousMultipliers: roundStateManager.getState().previousMultipliers,
        hashedServerSeed:
          roundStateManager.getState().provablyFairOutcome?.hashedServerSeed!,
      } satisfies OnConnectRes);
    });
  }
}
