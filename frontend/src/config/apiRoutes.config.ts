export const USER_API_ROUTES = {
  AUTH: {
    SIGN_UP: `/user/auth/signup`,
    SIGN_IN: `user/auth/signin`,
    STATUS: `/user/auth/status`,
    LOGOUT: "/user/auth/logout",
  },

  BET: {
    PAGINATED_HISTORY: ({ userId, page }: { userId: string; page: number }) =>
      `/user/bets?userId=${userId}&page=${page}`,
  },
};

export const GAME_API_ROUTES = {
  PROVABLY_FAIR_RESULTS: {
    GET_BY_ROUND_ID: (roundId: string) => `/game/provably-fair/${roundId}`,
  },
};
