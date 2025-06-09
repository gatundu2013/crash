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
  },
};
