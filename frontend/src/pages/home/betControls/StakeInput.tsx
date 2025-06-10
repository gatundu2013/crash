import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GAME_CONFIG } from "@/config/gameConfig.cofig";
import { cn } from "@/lib/utils";
import type { BetStoreI } from "@/stores/betStore";
import { RxMinus, RxPlus } from "react-icons/rx";

interface StakeInputProps extends Pick<BetStoreI, "stake" | "setStake"> {}

const StakeInput = ({ stake, setStake }: StakeInputProps) => {
  const incrementStake = () => {
    if (stake >= GAME_CONFIG.MAX_STAKE) return;
    setStake(stake + 10);
  };
  const decrementStake = () => {
    if (stake <= GAME_CONFIG.MIN_STAKE) return;
    setStake(stake - 10);
  };
  return (
    <div className="bg-layer-2 flex items-center rounded-2xl px-1 h-8 py-0.5 font-medium">
      <Button
        onClick={decrementStake}
        type="button"
        disabled={stake <= GAME_CONFIG.MIN_STAKE}
        className={cn(
          `bg-layer-5 font-bold flex items-center justify-center cursor-pointer w-6.5 h-6.5
           p-1.5 rounded-xl text-white transition-all hover:text-white active:scale-95`
        )}
      >
        <RxMinus />
      </Button>
      <Input
        className="h-full text-center bg-inherit border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none font-semibold tracking-wide"
        value={stake.toFixed(2)}
      />
      <Button
        onClick={incrementStake}
        disabled={stake >= GAME_CONFIG.MAX_STAKE}
        type="button"
        className="bg-layer-5 flex items-center justify-center cursor-pointer w-6.5 h-6.5 p-1.5 rounded-xl text-white transition-all hover:text-white active:scale-95"
      >
        <RxPlus />
      </Button>
    </div>
  );
};

export default StakeInput;
