export const SOCKET_EVENTS = {
  EMITTERS: {
    //game
    BROADCAST_HASHED_SERVER_SEED: "broadcastHashedServerSeed",
    BROADCAST_CURRENT_MULTIPLIER: "broadcastCurrentMultiplier",
    BROADCAST_NEXT_GAME_COUNT_DOWN: "broadcastNextGameCountDown",
    BROADCAST_TOP_STAKERS: "broadcastLiveBets",

    GAME_PHASE: {
      PREPARING: "game:preparing",
      BETTING: "game:betting",
      RUNNING: "game:running",
      END: "game:end",
      ERROR: "game:error",
    },

    BETTING: {
      PLACE_BET_SUCCESS: "betting:placebetSuccess",
      PLACE_BET_ERROR: "betting:placebetError",
      BET_ID: "betting:betId",

      CASHOUT_ERROR: "cashout:cashoutError",
      CASHOUT_SUCCESS: "cashout:cashoutSuccess",
    },
  },

  LISTENERS: {
    CONNECT: "connection",
    DISCONNECT: "disconnect",
  },
};
