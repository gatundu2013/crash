import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import useGameStore from "@/stores/gameStore";
import type { BetStoreI } from "@/types/frontend/bet.types";
import { GamePhase } from "@/types/shared/socketIo/gameTypes";

import { useEffect } from "react";

interface BetButtonProps extends BetStoreI {}

const BetButton = ({
  stake,
  hasScheduledBet,
  hasPlacedBet,
  hasAutoBet,
  isRequesting,
  betId,
  hasAutoCashout,
  autoCashoutValue,
  setIsRequesting,
  performBetAction,
  isPlaceButtonDisabled,
  handleGamePhaseChange,
  subscribeToSocketEvents,
  unsubscribeFromSocketEvents,
}: BetButtonProps) => {
  const gamePhase = useGameStore((state) => state.gamePhase);
  const currentMultiplier = useGameStore((state) => state.currentMultiplier);
  const isButtonDisabled = isPlaceButtonDisabled();

  useEffect(() => {
    subscribeToSocketEvents();
    return unsubscribeFromSocketEvents;
  }, [betId]);

  useEffect(() => {
    handleGamePhaseChange();
  }, [gamePhase, hasAutoBet]);

  // Avoid duplicate cashout if autoCashout already triggered
  useEffect(() => {
    if (
      hasAutoCashout &&
      hasPlacedBet &&
      currentMultiplier >= autoCashoutValue
    ) {
      setIsRequesting(true);
    }
  }, [currentMultiplier]);

  const handleBetUI = () => {
    if (isRequesting) {
      return {
        className: "text-sm font-medium",
        content: <span>Requesting...</span>,
      };
    }

    if (hasScheduledBet) {
      return {
        className:
          "bg-[#c9184a] text-white shadow-[0_0_12px_rgba(217,4,41,0.3),_inset_0_-2px_0_rgba(140,0,20,0.4)]",
        content: (
          <span className="flex flex-col items-center justify-center text-sm w-full h-full relative">
            <span>Cancel</span>
            <span className="text-white/85 text-xs">
              Waiting for next round
            </span>
          </span>
        ),
      };
    }

    if (gamePhase === GamePhase.BETTING && hasPlacedBet) {
      return {
        className:
          "shadow-[0_0_12px_rgba(43,147,72,0.3),_inset_0_-2px_0_rgba(0,100,20,0.4)]",
        content: <h4 className="text-sm">Bet Accepted</h4>,
      };
    }

    if (gamePhase === GamePhase.RUNNING && hasPlacedBet) {
      return {
        className:
          "bg-gradient-to-l from-[#FBD765] to-[#EF9E3F] text-black shadow-[0_0_12px_rgba(238,206,35,0.3),_inset_0_-2px_0_#CA7A1D]",
        content: (
          <div className="flex gap-1 items-baseline text-[15px]">
            <span className="text-sm font-medium">Cashout KES</span>
            <span className="font-semibold">
              {(stake * currentMultiplier).toFixed(2)}
            </span>
          </div>
        ),
      };
    }

    return {
      className: "",
      content: (
        <div className="flex gap-1 items-baseline">
          <span className="b">Bet {stake.toFixed(2)}</span>
          <span className="text-sm">KSH</span>
        </div>
      ),
    };
  };

  return (
    <div className="w-full h-11.5 mt-0.5">
      <Button
        type="button"
        onClick={performBetAction}
        disabled={isButtonDisabled}
        className={cn(
          "w-full h-full text-[16px] transition-all duration-300 font-semibold shadow-[0_0_12px_rgba(238,206,35,0.15),_inset_0_-2px_0_rgba(0,0,0,0.1)]",
          handleBetUI().className
        )}
      >
        {handleBetUI().content}
      </Button>
    </div>
  );
};

export default BetButton;
