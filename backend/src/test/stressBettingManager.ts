import { bettingManager } from "../services/betting/bettingManager";
import { BettingPayload } from "../types/bet.types";

const userData: BettingPayload = {
  userId: "35af0af5-dba6-450c-834b-9bc7b98bc51b",
  autoCashoutMultiplier: 1.2,
  clientSeed: null,
  stake: 10,
  storeId: "brian gatundu",
  username: "Lizu",
};

const socket = {
  emit() {
    return;
  },
};

export const runBettingStressTest = () => {
  let start = Date.now();
  for (let i = 0; i < 1024; i++) {
    bettingManager.stageBet({ payload: userData, socket: socket as any });
  }
  console.log("TimeTaken:" + (Date.now() - start) / 1000);
};
