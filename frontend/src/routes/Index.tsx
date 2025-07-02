import { createBrowserRouter, Outlet } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";

import SignIn from "@/pages/auth/SignIn";
import SignUp from "@/pages/auth/SignUp";
import Home from "@/pages/home/Index";
import Wallet from "@/pages/wallet/Index";
import BetHistory from "@/pages/betHistory/Index";
import GameRules from "@/pages/gameRules/Index";
import ProvablyFair from "@/pages/provablyFair/Index";
import NotFound from "@/pages/NotFound/Index";
import PublicRoute from "./PublicRoutes";
import ProtectedRoute from "./ProtectedRoute";

export const ROUTES = {
  HOME: "/",
  SIGN_UP: "/signup",
  SIGN_IN: "/signin",
  WALLET: "/wallet",
  BET_HISTORY: "/bethistory",
  GAME_RULES: "/game-rules",
  PROVABLY_FAIR: "/provably-fair",
  NOT_FOUND: "*",
};

export const routes = createBrowserRouter([
  {
    path: "/",
    element: (
      <MainLayout>
        <Outlet />
      </MainLayout>
    ),
    children: [
      // Public routes
      {
        element: <PublicRoute />,
        children: [
          { path: ROUTES.SIGN_IN, element: <SignIn /> },
          { path: ROUTES.SIGN_UP, element: <SignUp /> },
        ],
      },

      // Protected routes
      {
        element: <ProtectedRoute />,
        children: [
          { path: ROUTES.WALLET, element: <Wallet /> },
          { path: ROUTES.BET_HISTORY, element: <BetHistory /> },
          { path: ROUTES.GAME_RULES, element: <GameRules /> },
          { path: ROUTES.PROVABLY_FAIR, element: <ProvablyFair /> },
        ],
      },

      {
        path: ROUTES.HOME,
        element: <Home />,
      },

      // Catch-all
      {
        path: ROUTES.NOT_FOUND,
        element: <NotFound />,
      },
    ],
  },
]);
