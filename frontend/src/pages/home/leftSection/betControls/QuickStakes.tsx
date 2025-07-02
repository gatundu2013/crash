import { Button } from "@/components/ui/button";
import { GAME_CONFIG } from "@/config/game.config";
import type { BetStoreI } from "@/types/shared/frontend/bet.types";

interface QuickStakeProps
  extends Pick<BetStoreI, "setStake" | "areBetControlsDisabled"> {}

const QuickStakes = ({ setStake, areBetControlsDisabled }: QuickStakeProps) => {
  const areControlsDisabled = areBetControlsDisabled();

  const predefinedStakes = [
    GAME_CONFIG.MIN_STAKE,
    50,
    100,
    GAME_CONFIG.MAX_STAKE,
  ];

  const handleStakeSelection = (selectedStakeAmount: number) => {
    setStake(selectedStakeAmount);
  };

  return (
    <div className="flex gap-1.5">
      {predefinedStakes.map((stakeAmount, index) => (
        <Button
          disabled={areControlsDisabled}
          onClick={() => handleStakeSelection(stakeAmount)}
          key={index}
          className="h-6 w-full font-normal flex-1 px-3 bg-layer-2 text-white/80 rounded-full transition-colors"
        >
          {stakeAmount.toFixed(2)}
        </Button>
      ))}
    </div>
  );
};

export default QuickStakes;
