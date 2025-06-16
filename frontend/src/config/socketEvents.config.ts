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

    BROADCAST_TOP_STAKERS: "broadcastTopStakers",

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

      CASHOUT_ERROR: (betId: string) => `cashout:cashoutError:${betId}`,
      CASHOUT_SUCCESS: (betId: string) => `cashout:cashoutSuccess:${betId}`,
    },
  },
};
