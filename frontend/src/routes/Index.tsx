import { createBrowserRouter, Outlet } from "react-router-dom";
import { lazy, Suspense } from "react";
import MainLayout from "@/layouts/MainLayout";
import PublicRoute from "./PublicRoutes";
import ProtectedRoute from "./ProtectedRoute";
import Avatar from "../assets/avatar.png";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

const SignIn = lazy(() => import("@/pages/auth/SignIn"));
const SignUp = lazy(() => import("@/pages/auth/SignUp"));
const Home = lazy(() => import("@/pages/home/Index"));
const Wallet = lazy(() => import("@/pages/wallet/Index"));
const BetHistory = lazy(() => import("@/pages/betHistory/Index"));
const GameRules = lazy(() => import("@/pages/gameRules/Index"));
const ProvablyFair = lazy(() => import("@/pages/provablyFair/Index"));
const NotFound = lazy(() => import("@/pages/NotFound/Index"));

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
      <Suspense fallback={<LazyLoadFallBack />}>
        <MainLayout>
          <Outlet />
        </MainLayout>
      </Suspense>
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
          {
            path: ROUTES.PROVABLY_FAIR,
            element: <ProvablyFair />,
          },
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

function LazyLoadFallBack() {
  return (
    <div className="flex flex-col items-center justify-center -translate-y-36 min-h-screen gap-2 text-center bg-layer-1">
      <img
        src={Avatar}
        alt="Loading avatar"
        className="w-10 h-10 rounded-full border border-layer-6 shadow-md"
      />
      <div className="flex items-center gap-2 text-white/70">
        <AiOutlineLoading3Quarters className="w-5 h-5 animate-spin" />
        <span className="text-sm font-medium">Loading...</span>
      </div>
    </div>
  );
}
