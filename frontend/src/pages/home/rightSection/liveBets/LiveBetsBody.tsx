import { cn } from "@/lib/utils";
import useGameStore from "@/stores/gameStore";
import Avator from "../../../../assets/avatar.png";

const LiveBetsBody = () => {
  const topStakers = useGameStore((state) => state.topStakers);

  return (
    <div className="mt-2 flex-1 overflow-y-scroll  mb-3 gap-1">
      {topStakers.length > 0 ? (
        <div className="flex flex-col space-y-3 pt-1">
          {topStakers.map((topStaker, index) => (
            <div
              key={topStaker?.username || index}
              className="grid grid-cols-4 text-sm font-semibold px-1"
            >
              {/* Player */}
              <span className="truncate">
                {topStaker?.username?.substring(0, 10) || "Unknown"}
              </span>

              {/* Stake */}
              <span>{topStaker?.stake?.toFixed(2) ?? "-"}</span>

              {/* Multiplier */}
              <span
                className={cn(topStaker.cashoutMultiplier && "text-[#ff499e]")}
              >
                {topStaker.cashoutMultiplier
                  ? `${topStaker.cashoutMultiplier.toFixed(2)}x`
                  : "-"}
              </span>

              {/* Payout */}
              <span
                className={cn(topStaker.cashoutMultiplier && "text-green-1")}
              >
                {topStaker.payout ? `KES ${topStaker.payout.toFixed(2)}` : "-"}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col justify-center space-y-1 items-center mt-20">
          <div className="w-12 h-12 rounded-full bg-layer-5 flex items-center justify-center">
            <img
              src={Avator}
              alt="avator"
              className="w-full h-full object-contain"
            />
          </div>
          <h4 className="text-md">No bets yet.</h4>
        </div>
      )}
    </div>
  );
};

export default LiveBetsBody;
