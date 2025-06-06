import { startServer } from "./app";
import { bettingManager } from "./services/betting/bettingManager";
import { roundStateManager } from "./services/game/roundStateManager";

// gameLifeCycleManager.startGame()
//
// ;

startServer();
roundStateManager.getState();

bettingManager.openBettingWindow();

const userId1 = "683ca86b63cbd1368d7b225d";
const userId2 = "683d41bdc7757ef6d4b7af4e";
const socket = { emit: () => {} };

for (let i = 0; i < 4; i++) {
  let userId = i % 2 ? userId1 : userId2;

  bettingManager.stageBet(
    {
      autoCashoutMultiplier: 1,
      clientSeed: "inGodWetrust",
      stake: 2,
      userId,
      username: "brian",
    },
    socket
  );
}
