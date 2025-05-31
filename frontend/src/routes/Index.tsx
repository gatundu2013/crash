import SignIn from "@/pages/auth/SignIn";
import SignUp from "@/pages/auth/SignUp";
import Home from "@/pages/Home";
import MainLayout from "@/layouts/MainLayout";
import { createBrowserRouter, Outlet } from "react-router-dom";

export const routes = createBrowserRouter([
  {
    path: "/",
    element: (
      <MainLayout sidebarContent={<div>chats here</div>}>
        <div className="w-full h-full flex justify-center px-4 md:px-0">
          <Outlet />
        </div>
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
