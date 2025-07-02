export const SOCKET_EVENTS = {
  EMITTERS: {
    //game
    BROADCAST_SUCCESSFUL_BETS: "broadcastSuccessfulBets",
    BROADCAST_SUCCESSFUL_CASHOUTS: "broadSuccessfulCashouts",
    RESET_LIVE_STATS: "resetLiveStatus",
    ON_CONNECT_DATA: "onConnectData",

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

      CASHOUT_SUCCESS: (betId: string) =>
        `cashout:cashoutSuccess:${betId}`.trim(),
      CASHOUT_ERROR: (betId: string) => `cashout:cashoutError:${betId}`.trim(),
    },
  },

  LISTENERS: {
    CONNECT: "connection",
    DISCONNECT: "disconnect",

    BETTING: {
      PLACE_BET: "game:placeBet",
      CASHOUT: "game:cashout",
    },
  },
} as const;
