import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GAME_CONFIG } from "@/config/game.cofig";
import { cn } from "@/lib/utils";
import type { BetStoreI } from "@/stores/betStore";
import { useEffect, useState, type ChangeEvent } from "react";
import { RxMinus, RxPlus } from "react-icons/rx";

interface StakeInputProps extends Pick<BetStoreI, "stake" | "setStake"> {}

const StakeInput = ({ stake, setStake }: StakeInputProps) => {
  const [displayValue, setDisplayValue] = useState(stake.toFixed(2));

  const incrementStake = () => {
    const newVal = Math.min(stake + 10, GAME_CONFIG.MAX_STAKE);
    setStake(newVal);
    setDisplayValue(newVal.toFixed(2));
  };

  const decrementStake = () => {
    const newVal = Math.max(stake - 10, GAME_CONFIG.MIN_STAKE);
    setStake(newVal);
    setDisplayValue(newVal.toFixed(2));
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (GAME_CONFIG.INPUT_REGEX.test(val)) {
      setDisplayValue(val);
    }
  };

  const hanldeInputBlur = () => {
    const parsed = parseFloat(displayValue);

    if (isNaN(parsed)) {
      setDisplayValue(stake.toFixed(2));
      return;
    }

    const clamped = Math.min(
      Math.max(parsed, GAME_CONFIG.MIN_STAKE),
      GAME_CONFIG.MAX_STAKE
    );

    setStake(clamped);
    setDisplayValue(clamped.toFixed(2));
  };

  useEffect(() => {
    setDisplayValue(stake.toFixed(2));
  }, [stake]);

  const btnClass = `bg-layer-5 flex items-center justify-center cursor-pointer w-6 
    h-6 p-1.5 rounded-full text-white transition-all hover:text-white active:scale-95`;

  return (
    <div className="bg-layer-2 w-full flex items-center rounded-2xl px-1 h-8 py-0.5 font-medium">
      <Button
        onClick={decrementStake}
        disabled={stake <= GAME_CONFIG.MIN_STAKE}
        type="button"
        className={cn("font-bold", btnClass)}
      >
        <RxMinus />
      </Button>

      <Input
        value={displayValue}
        onChange={handleInputChange}
        onBlur={hanldeInputBlur}
        className="h-full text-center bg-inherit border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none font-semibold tracking-wide"
      />

      <Button
        onClick={incrementStake}
        disabled={stake >= GAME_CONFIG.MAX_STAKE}
        type="button"
        className={btnClass}
      >
        <RxPlus />
      </Button>
    </div>
  );
};

export default StakeInput;
