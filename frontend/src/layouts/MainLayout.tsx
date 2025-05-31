import NavBar from "@/components/navbar/Index";
import useChatStore from "@/stores/chatStore";
import React from "react";

interface MainLayoutProps {
  children: React.ReactNode;
  sidebarContent: React.ReactNode;
}

const MainLayout = ({ children, sidebarContent }: MainLayoutProps) => {
  const chatsAreShown = useChatStore((state) => state.chatsAreShown);
  return (
    <div className="flex">
      <div className="w-full relative">
        <NavBar />
        <div className="mt-[64px] h-[calc(100vh-64px)]">{children}</div>
        <div>Footer</div>
      </div>
      {chatsAreShown && (
        <div className="w-full absolute top-0 bottom-0 md:relative md:w-[400px] bg-red-500">
          {sidebarContent || "chats"}
        </div>
      )}
    </div>
  );
};

export default MainLayout;
