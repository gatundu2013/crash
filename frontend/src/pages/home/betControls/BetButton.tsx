import { Button } from "@/components/ui/button";
import { SOCKET_EVENTS } from "@/config/socketEvents.config";
import { cn } from "@/lib/utils";
import useAuthStore from "@/stores/authStore";
import type { BetStoreI } from "@/stores/betStore";
import useGameStore from "@/stores/gameStore";
import useSocketStore from "@/stores/socketStore";
import type { BettingPayload, SuccessfulBetRes } from "@/types/bet.types";
import { GamePhase } from "@/types/game.types";
import { useEffect } from "react";
import { toast } from "react-toastify";

interface BetButtonProps extends BetStoreI {}

const BetButton = ({
  stake,
  hasAutoCashout,
  hasScheduledBet,
  autoCashoutValue,
  hasPlacedBet,
  performBetAction,
  setIsRequesting,
  onBetSuccess,
  onBetFailure,
  resetBetState,
}: BetButtonProps) => {
  const socket = useSocketStore((state) => state.socket);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userData = useAuthStore((state) => state.userData);
  const updateUserData = useAuthStore((state) => state.updateUserData);
  const gamePhase = useGameStore((state) => state.gamePhase);

  const handlePlaceBet = () => {
    if (!isAuthenticated || !userData) {
      toast.error("Login required");
      return;
    }

    if (!socket) {
      toast.error("Connection error. Please try again.");
      return;
    }

    const bettingPayload: BettingPayload = {
      stake,
      autoCashoutMultiplier: hasAutoCashout ? autoCashoutValue : null,
      userId: userData.userId,
      clientSeed: "",
      username: userData.username,
    };

    setIsRequesting(true);
    socket.emit(SOCKET_EVENTS.EMITTERS.BETTING.PLACE_BET, bettingPayload);
  };

  useEffect(() => {
    socket?.on(
      SOCKET_EVENTS.LISTENERS.BETTING.PLACE_BET_ERROR,
      ({ message }) => {
        onBetFailure();
        toast.error(message);
      }
    );

    socket?.on(
      SOCKET_EVENTS.LISTENERS.BETTING.PLACE_BET_SUCCESS,
      (data: SuccessfulBetRes) => {
        onBetSuccess(data.betId);
        updateUserData({ accountBalance: data.accountBalance });
      }
    );

    return () => {
      socket?.off(SOCKET_EVENTS.LISTENERS.BETTING.PLACE_BET_ERROR);
      socket?.off(SOCKET_EVENTS.LISTENERS.BETTING.CASHOUT_ERROR);
    };
  }, [socket]);

  useEffect(() => {
    if (gamePhase === GamePhase.END && hasPlacedBet) {
      resetBetState();
    }

    if (gamePhase === GamePhase.BETTING && hasScheduledBet) {
      handlePlaceBet();
    }
  }, [gamePhase]);

  const handleBetUI = () => {
    if (hasScheduledBet) {
      return {
        className: "bg-[#cb011a] text-white border-red-500",
        content: <h4>Cancel</h4>,
      };
    }

    if (hasPlacedBet) {
      return {
        className: "bg-[#d07206] text-white",
        content: (
          <div className="flex gap-1 items-baseline">
            <span className="b">Cashout {stake.toFixed(2)}</span>
            <span className="text-sm">KSH</span>
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
        onClick={() =>
          performBetAction({
            gamePhase,
            placeBet: handlePlaceBet,
            cashout: () => {},
          })
        }
        type="button"
        className={cn(
          "w-full h-full text-[18px] font-semibold",
          handleBetUI().className
        )}
      >
        {handleBetUI().content}
      </Button>
    </div>
  );
};

export default BetButton;
