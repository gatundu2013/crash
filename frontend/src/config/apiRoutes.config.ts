export const API_ROUTES = {
  AUTH: {
    SIGN_UP: `/auth/signup`,
    SIGN_IN: `/auth/signin`,
    STATUS: `/auth/status`,
    LOGOUT: "/auth/logout",
  },

  BET_HISTORY: {
    PAGINATED_HISTORY: ({ userId, page }: { userId: string; page: number }) =>
      `/history/bethistory?userId=${userId}&page=${page}`,
  },
};
