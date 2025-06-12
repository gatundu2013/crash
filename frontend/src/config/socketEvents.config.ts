export const SOCKET_EVENTS = {
  EMITTERS: {},

  LISTENERS: {
    CONNECT: "connection",
    DISCONNECT: "disconnect",

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
};
