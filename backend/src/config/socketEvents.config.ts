export const SOCKET_EVENTS = {
  EMITTERS: {
    //game
    BROADCAST_HASHED_SERVER_SEED: "broadcastHashedServerSeed",
    BROADCAST_CURRENT_MULTIPLIER: "broadcastCurrentMultiplier",

    GAME_PHASE: {
      PREPARING: "game:preparing",
      BETTING: "game:betting",
      RUNNING: "game:running",
      CRASHED: "game:crashed",
      ERROR: "game:error",
    },

    BETTING: {
      PLACE_BET_SUCCESS: "betting:placebetSuccess",
      PLACE_BET_ERROR: "betting:placebetError",
      BET_ID: "betting:betId",
    },
  },

  LISTENERS: {
    CONNECT: "connection",
    DISCONNECT: "disconnect",
  },
};
