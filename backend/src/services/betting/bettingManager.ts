import { Socket } from "socket.io";
import { BettingPayload } from "../../types/bet.types";
import { SOCKET_EVENTS } from "../../config/socketEvents.config";
import { v4 as uuidv4 } from "uuid";

interface StagedBet {
  payload: BettingPayload & { betId: string };
  socket: Socket;
}

class BettingManager {
  private static instance: BettingManager;

  private readonly MAX_BETS_PER_USER = 2;

  private stagedBetsMap: Map<string, StagedBet> = new Map(); // stages all incoming bets
  private userIdsToBetIds: Map<string, Set<string>> = new Map(); // for tracking how many bets a user has

  private constructor() {}

  public static getInstance() {
    if (!BettingManager.instance) {
      BettingManager.instance = new BettingManager();
    }
    return BettingManager.instance;
  }

  public stageBet(params: BettingPayload, socket: Socket) {
    if (this.userHasMaxBets(params.userId)) {
      socket.emit(SOCKET_EVENTS.EMITTERS.BETTING.PLACE_BET_ERROR, {
        message: "Max bet reached",
        maxBet: this.MAX_BETS_PER_USER,
      });
      return;
    }

    const betId = uuidv4();

    //update user bet tracking
    const userBetsIds = this.userIdsToBetIds.get(params.userId) || new Set();
    userBetsIds.add(betId);

    //stage bet
    const betToStage: StagedBet = { payload: { ...params, betId }, socket };
    this.stagedBetsMap.set(betId, betToStage);
  }

  private userHasMaxBets(userId: string) {
    const existingBets = this.userIdsToBetIds.get(userId);

    if (!existingBets) return false;

    return existingBets.size >= this.MAX_BETS_PER_USER;
  }
}

export const bettingManager = BettingManager.getInstance();
