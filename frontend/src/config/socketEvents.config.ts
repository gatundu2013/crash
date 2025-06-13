export const SOCKET_EVENTS = {
  EMITTERS: {
    BETTING: {
      PLACE_BET: "game:placeBet",
      CASHOUT: "game:cashout",
    },
  },

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
      PLACE_BET_SUCCESS: (storeId: string) =>
        `betting:placebetSuccess:${storeId}`.trim(),
      PLACE_BET_ERROR: (storeId: string) =>
        `betting:placebetError:${storeId}`.trim(),

      BET_ID: "betting:betId",
      CASHOUT_ERROR: "cashout:cashoutError",
      CASHOUT_SUCCESS: "cashout:cashoutSuccess",
    },
  },
};
