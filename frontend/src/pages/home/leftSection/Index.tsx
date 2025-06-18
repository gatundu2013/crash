import BetGrid from "./betControls/Index";
import Canvas from "./canvas/Index";
import PreviousMultipliers from "./previousMutipliers/Index";

const LeftSection = () => {
  return (
    <div className="w-full flex flex-col bg-layer-2 rounded-xl py-1 md:py-2 md:px-5 min-w-0 h-[calc(100vh-75px)]">
      <PreviousMultipliers />
      <Canvas />
      <BetGrid />
    </div>
  );
};

export default LeftSection;
