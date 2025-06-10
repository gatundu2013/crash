import PreviousMultipliers from "./previousMutipliers/Index";
import CanvasComponent from "./canvas/Index";
import BetGrid from "./betControls/Index";

const Home = () => {
  return (
    <div className="flex flex-col md:flex-row w-full h-full gap-1.5 overflow-hidden">
      <div className="w-full lg:flex-1 bg-layer-2 rounded-xl h-full py-2 px-5 min-w-0">
        <PreviousMultipliers />
        <CanvasComponent />
        <BetGrid />
      </div>
      <div className="w-full lg:w-[400px] lg:min-w-[400px] lg:max-w-[400px] bg-layer-4 rounded-xl h-full">
        Sidebar Content
      </div>
    </div>
  );
};

export default Home;
