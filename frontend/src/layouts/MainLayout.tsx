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
    <div className="flex relative overflow-hidden">
      <div
        className={`w-full ${
          chatsAreShown ? "md:w-[calc(100%-350px)]" : "w-full"
        } transition-all duration-300`}
      >
        <NavBar />
        <div className="mt-[5px] h-[calc(100vh-64px)] max-w-[100vw] px-1 lg:px-6 ">
          {children}
        </div>
        <div>Footer</div>
      </div>
      {chatsAreShown && (
        <div className="w-full h-full fixed right-0 top-0 bottom-0 z-10 md:z-auto md:relative md:w-[350px] bg-red-500">
          {sidebarContent || "chats"}
        </div>
      )}
    </div>
  );
};

export default MainLayout;
