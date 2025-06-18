import { cn } from "@/lib/utils";
import LeftSection from "./leftSection/Index";
import RightSection from "./rightSection/Index";

const Home = () => {
  return (
    <div className={cn("flex flex-col md:flex-row w-full h-full gap-1.5")}>
      <LeftSection />
      <RightSection />
    </div>
  );
};

export default Home;
