import NavBar from "@/components/navbar/Index";
import React from "react";

interface MainLayoutProps {
  body: React.ReactNode;
  sidebarContent: React.ReactNode;
}

const MainLayout = ({ body, sidebarContent }: MainLayoutProps) => {
  return (
    <div className="flex">
      <div className="w-full relative">
        <NavBar />
        <div className="mt-[64px] h-[calc(100vh-64px)]">{body}</div>
        <div>Footer</div>
      </div>
      <div className="w-[350px]">{sidebarContent || "chats"}</div>
    </div>
  );
};

export default MainLayout;
