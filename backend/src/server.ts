import { startServer } from "./app";
import { bettingManager } from "./services/betting/bettingManager";

// Start server
startServer();

bettingManager.openBettingWindow();

const userId = "683ca86b63cbd1368d7b225d";
const socket = { emit: () => {} };

for (let i = 0; i < 5; i++) {
  bettingManager.stageBet(
    { autoCashoutMultiplier: 1, clientSeed: "dd", stake: 200, userId },
    socket
  );
}
