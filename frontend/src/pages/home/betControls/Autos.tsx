import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { GAME_CONFIG } from "@/config/gameConfig.cofig";
import type { BetStoreI } from "@/stores/betStore";
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
  > {}

const Autos = ({
  hasAutoBet,
  hasAutoCashout,
  autoCashoutValue,
  setAutoCashoutValue,
  setAutoBet,
  setAutoCashout,
}: AutosProps) => {
  const [autoCashoutMultiplier, setAutoCashoutMultiplier] = useState(
    autoCashoutValue.toFixed(2)
  );

  const handleAutoCashoutMultiplierChange = (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;

    if (GAME_CONFIG.INPUT_REGEX.test(value)) {
      setAutoCashoutMultiplier(value);
    }
  };

  const handleAutoCashoutMultiplierBlur = () => {
    const parsed = parseFloat(autoCashoutMultiplier);

    if (Number.isNaN(parsed)) {
      setAutoCashoutMultiplier(GAME_CONFIG.MIN_AUTO_CASHOUT_VALUE.toFixed(2));
      return;
    }

    if (parsed < GAME_CONFIG.MIN_AUTO_CASHOUT_VALUE) {
      setAutoCashoutMultiplier(GAME_CONFIG.MIN_AUTO_CASHOUT_VALUE.toFixed(2));
      setAutoCashoutValue(GAME_CONFIG.MIN_AUTO_CASHOUT_VALUE);
      return;
    }

    setAutoCashoutMultiplier(parsed.toFixed(2));
    setAutoCashoutValue(parsed);
  };

  return (
    <div className="flex justify-between items-center text-white mt-1">
      {/* AutoBet */}
      <div className="flex gap-1.5 items-center">
        <h4 className="text-sm">AutoBet</h4>
        <Switch
          checked={hasAutoBet}
          onCheckedChange={() => setAutoBet(!hasAutoBet)}
        />
      </div>

      {/* Auto Cashout */}
      <div className="flex gap-1 items-center">
        <div className="flex items-center gap-1">
          <h4 className="text-sm">Auto Cashout</h4>
          <Switch
            checked={hasAutoCashout}
            onCheckedChange={() => setAutoCashout(!hasAutoCashout)}
          />
        </div>
        <div className="flex items-center bg-layer-1 w-16 h-6 rounded-full">
          <Input
            onBlur={handleAutoCashoutMultiplierBlur}
            onChange={handleAutoCashoutMultiplierChange}
            value={autoCashoutMultiplier}
            className="w-full rounded-full px-1.5 font-medium h-full text-center border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none text-white text-xs"
          />
          <button className="mr-1 text-white/60 hover:text-white transition-colors">
            <RxCross1 size={10} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Autos;
