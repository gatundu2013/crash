import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GAME_CONFIG } from "@/config/game.config";
import { cn } from "@/lib/utils";
import type { BetStoreI } from "@/types/bet.types";
import { useEffect, useState, type ChangeEvent } from "react";
import { RxMinus, RxPlus } from "react-icons/rx";

interface StakeInputProps
  extends Pick<BetStoreI, "stake" | "setStake" | "areBetControlsDisabled"> {}

const StakeInput = ({
  stake,
  setStake,
  areBetControlsDisabled,
}: StakeInputProps) => {
  const [displayValue, setDisplayValue] = useState(stake.toFixed(2));
  const areControlsDisabled = areBetControlsDisabled();

  const handleIncrement = () => {
    const next = Math.min(stake + 10, GAME_CONFIG.MAX_STAKE);
    setStake(next);
    setDisplayValue(next.toFixed(2));
  };

  const handleDecrement = () => {
    const next = Math.max(stake - 10, GAME_CONFIG.MIN_STAKE);
    setStake(next);
    setDisplayValue(next.toFixed(2));
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (GAME_CONFIG.INPUT_REGEX.test(value)) {
      setDisplayValue(value);
    }
  };

  const handleInputBlur = () => {
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

  const buttonClass = cn(
    "bg-layer-5 flex items-center justify-center cursor-pointer w-6 h-6 p-1.5",
    "rounded-full text-white transition-all hover:text-white active:scale-95 font-bold"
  );

  return (
    <div className="bg-layer-2 w-full flex items-center rounded-2xl px-1 h-8 py-0.5 font-medium">
      <Button
        type="button"
        onClick={handleDecrement}
        disabled={stake <= GAME_CONFIG.MIN_STAKE || areControlsDisabled}
        className={buttonClass}
      >
        <RxMinus />
      </Button>

      <Input
        value={displayValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        disabled={areControlsDisabled}
        className="h-full text-center bg-inherit border-none font-semibold tracking-wide 
                   focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
      />

      <Button
        type="button"
        onClick={handleIncrement}
        disabled={stake >= GAME_CONFIG.MAX_STAKE || areControlsDisabled}
        className={buttonClass}
      >
        <RxPlus />
      </Button>
    </div>
  );
};

export default StakeInput;
