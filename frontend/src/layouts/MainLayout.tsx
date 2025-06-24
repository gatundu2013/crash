import Footer from "@/components/footer";
import NavBar from "@/components/navbar/Index";
import React from "react";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="relative flex w-full">
      <div className="w-full">
        <NavBar />
        <div className="mt-1 lg:mt-2 px-2 min-h-[calc(100vh-62px)]">
          {children}
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default MainLayout;
