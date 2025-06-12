import NavBar from "@/components/navbar/Index";
import { cn } from "@/lib/utils";
import useChatStore from "@/stores/chatStore";
import React from "react";

interface MainLayoutProps {
  children: React.ReactNode;
  chats: React.ReactNode;
}

const MainLayout = ({ children, chats }: MainLayoutProps) => {
  const chatsAreShown = useChatStore((state) => state.chatsAreShown);
  return (
    <div className="relative flex w-full">
      <div
        className={cn("w-full", chatsAreShown && "md:w-[calc(100vw-350px)]")}
      >
        <NavBar />
        <div className="mt-1 lg:mt-2 px-2">{children}</div>
        <div>Footer</div>
      </div>
      {chatsAreShown && (
        <div className="fixed z-20 left-0 right-0 top-0 bottom-0 md:relative md:w-[350px] bg-red-500">
          {chats || "Chats"}
        </div>
      )}
    </div>
  );
};

export default MainLayout;
