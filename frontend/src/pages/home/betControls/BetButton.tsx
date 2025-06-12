import { Button } from "@/components/ui/button";
import { SOCKET_EVENTS } from "@/config/socketEvents.config";
import useAuthStore from "@/stores/authStore";
import type { BetStoreI } from "@/stores/betStore";
import useSocketStore from "@/stores/socketStore";
import type { BettingPayload } from "@/types/bet.types";
import { useEffect } from "react";
import { toast } from "react-toastify";

interface BetButtonProps
  extends Pick<BetStoreI, "stake" | "autoCashoutValue" | "hasAutoCashout"> {}

const BetButton = ({
  stake,
  hasAutoCashout,
  autoCashoutValue,
}: BetButtonProps) => {
  const socket = useSocketStore((state) => state.socket);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userData = useAuthStore((state) => state.userData);

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

    socket.emit("placeBet", bettingPayload);
  };

  useEffect(() => {
    socket?.on(
      SOCKET_EVENTS.LISTENERS.BETTING.PLACE_BET_ERROR,
      ({ message }) => {
        toast.error(message);
      }
    );

    return () => {
      socket?.off(SOCKET_EVENTS.LISTENERS.BETTING.PLACE_BET_ERROR);
    };
  }, [socket]);

  return (
    <div className="w-full h-11.5 mt-0.5">
      <Button
        onClick={handlePlaceBet}
        type="button"
        className="w-full h-full text-[18px] font-semibold flex items-baseline gap-1 border border-white/10"
      >
        <span className="b">Bet {stake.toFixed(2)}</span>
        <span className="text-sm">KSH</span>
      </Button>
    </div>
  );
};

export default BetButton;
