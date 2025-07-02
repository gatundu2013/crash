import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { GAME_CONFIG } from "@/config/game.config";
import type { BetStoreI } from "@/types/frontend/bet.types";
import { useState, type ChangeEvent } from "react";
import { RxCross1 } from "react-icons/rx";

interface AutosProps
  extends Pick<
    BetStoreI,
    | "hasAutoBet"
    | "autoCashoutValue"
    | "hasAutoCashout"
    | "setAutoCashoutValue"
    | "setAutoBet"
    | "setAutoCashout"
    | "areBetControlsDisabled"
  > {}

const Autos = ({
  hasAutoBet,
  hasAutoCashout,
  autoCashoutValue,
  setAutoCashoutValue,
  setAutoBet,
  setAutoCashout,
  areBetControlsDisabled,
}: AutosProps) => {
  const [displayValue, setDisplayValue] = useState(autoCashoutValue.toFixed(2));
  const areControlsDisabled = areBetControlsDisabled();

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (GAME_CONFIG.INPUT_REGEX.test(val)) {
      setDisplayValue(val);
    }
  };

  const handleInputBlur = () => {
    const parsed = parseFloat(displayValue);
    if (Number.isNaN(parsed)) {
      const fallback = GAME_CONFIG.MIN_AUTO_CASHOUT_VALUE.toFixed(2);
      setDisplayValue(fallback);
      return;
    }

    const clamped = Math.max(parsed, GAME_CONFIG.MIN_AUTO_CASHOUT_VALUE);
    setDisplayValue(clamped.toFixed(2));
    setAutoCashoutValue(clamped);
  };

  const toggleAutoBet = () => setAutoBet(!hasAutoBet);
  const toggleAutoCashout = () => setAutoCashout(!hasAutoCashout);

  return (
    <div className="flex justify-between items-center text-white">
      {/* AutoBet */}
      <div className="flex gap-1.5 items-center">
        <h4 className="text-sm">AutoBet</h4>
        <Switch checked={hasAutoBet} onCheckedChange={toggleAutoBet} />
      </div>

      {/* Auto Cashout */}
      <div className="flex gap-1 items-center">
        <div className="flex items-center gap-1">
          <h4 className="text-sm">Auto Cashout</h4>
          <Switch
            disabled={areControlsDisabled}
            checked={hasAutoCashout}
            onCheckedChange={toggleAutoCashout}
          />
        </div>
        <div className="flex items-center bg-layer-1 w-16 h-7 rounded-full">
          <Input
            disabled={areControlsDisabled || !hasAutoCashout}
            onBlur={handleInputBlur}
            onChange={handleInputChange}
            value={displayValue}
            className="w-full bg-inherit rounded-full px-1.5 font-medium h-full text-center border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none text-white text-xs"
          />

          <RxCross1 size={12} className="mr-1" />
        </div>
      </div>
    </div>
  );
};

export default Autos;
