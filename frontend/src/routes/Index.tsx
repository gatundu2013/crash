import SignIn from "@/pages/auth/SignIn";
import SignUp from "@/pages/auth/SignUp";
import Home from "@/pages/home/Index";
import MainLayout from "@/layouts/MainLayout";
import { createBrowserRouter, Outlet } from "react-router-dom";
import NotFound from "@/pages/NotFound/Index";
import Wallet from "@/pages/wallet/Index";
import BetHistory from "@/pages/betHistory/Index";

export const routes = createBrowserRouter([
  {
    path: "/",
    element: (
      <MainLayout>
        <Outlet />
      </MainLayout>
    ),
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/signup",
        element: <SignUp />,
      },
      {
        path: "/signin",
        element: <SignIn />,
      },
      {
        path: "/wallet",
        element: <Wallet />,
      },
      {
        path: "/bethistory",
        element: <BetHistory />,
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
