import SignIn from "@/pages/auth/SignIn";
import SignUp from "@/pages/auth/SignUp";
import Home from "@/pages/home/Index";
import MainLayout from "@/layouts/MainLayout";
import { createBrowserRouter, Outlet } from "react-router-dom";

export const routes = createBrowserRouter([
  {
    path: "/",
    element: (
      <MainLayout sidebarContent={<div>chats here</div>}>
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
    ],
  },
]);
