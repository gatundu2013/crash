import { bettingManager } from "../services/game/gameEngine/bettingManager";
import { BettingPayload } from "../types/shared/socketIo/betTypes";

type MockSocket = {
  emit: (event: string, ...args: any[]) => void;
};

const socket: MockSocket = {
  emit: () => {},
};

const bettingPayload: BettingPayload = {
  autoCashoutMultiplier: null,
  clientSeed: "gatundu",
  stake: 10,
  storeId: "33",
  userId: "c110e642-41c1-48a9-b481-6a3030282069",
  username: "brian",
};

export const stressTestBettingManager = () => {
  console.log("called");
  for (let i = 0; i < 1000; i++) {
    bettingManager.stageBet({
      payload: bettingPayload,
      socket,
    });
  }
};
