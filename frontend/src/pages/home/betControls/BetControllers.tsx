import StakeInput from "./StakeInput";
import QuickStakes from "./QuickStakes";
import BetButton from "./BetButton";
import Autos from "./Autos";

const BetController = () => {
  return (
    <div className="w-full bg-layer-4 rounded-xl px-3 py-3">
      <div className="w-full lg:w-[73%] mx-auto flex flex-col space-y-2 flex-1 rounded-lg">
        <StakeInput />
        <QuickStakes />
        <BetButton />
        <Autos />
      </div>
    </div>
  );
};

export default BetController;
