import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GAME_CONFIG } from "@/config/gameConfig.cofig";
import { cn } from "@/lib/utils";
import type { BetStoreI } from "@/stores/betStore";
import { useEffect, useState, type ChangeEvent } from "react";
import { RxMinus, RxPlus } from "react-icons/rx";

interface StakeInputProps extends Pick<BetStoreI, "stake" | "setStake"> {}

const StakeInput = ({ stake, setStake }: StakeInputProps) => {
  const [stakeValue, setStakeValue] = useState<string>(() => stake.toFixed(2));

  const incrementStake = () => {
    const next = Math.min(stake + 10, GAME_CONFIG.MAX_STAKE);
    setStake(next);
    setStakeValue(next.toFixed(2));
  };

  const decrementStake = () => {
    const next = Math.max(stake - 10, GAME_CONFIG.MIN_STAKE);
    setStake(next);
    setStakeValue(next.toFixed(2));
  };

  const handleStakeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Only allow digits and one dot
    if (GAME_CONFIG.INPUT_REGEX.test(value)) {
      setStakeValue(value);
    }
  };

  const handleBlur = () => {
    const parsed = parseFloat(stakeValue);

    if (isNaN(parsed)) {
      setStakeValue(stake.toFixed(2)); // fallback to current stake if input is invalid
      return;
    }

    const clamped = Math.min(
      Math.max(parsed, GAME_CONFIG.MIN_STAKE),
      GAME_CONFIG.MAX_STAKE
    );
    const formatted = clamped.toFixed(2);
    setStake(clamped);
    setStakeValue(formatted);
  };

  useEffect(() => {
    setStakeValue(stake.toFixed(2));
  }, [stake]);

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
        value={stakeValue}
        onChange={handleStakeChange}
        onBlur={handleBlur}
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
