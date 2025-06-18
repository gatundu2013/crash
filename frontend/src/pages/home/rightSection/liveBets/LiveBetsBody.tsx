import { cn } from "@/lib/utils";
import useGameStore from "@/stores/gameStore";

const LiveBetsBody = () => {
  const gamePhase = useGameStore((state) => state.gamePhase);
  const topStakers = useGameStore((state) => state.topStakers);

  return (
    <div className="mt-2 flex-1 overflow-y-scroll mb-3 gap-1">
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
            <span className={cn(topStaker.cashoutMultiplier && "text-green-1")}>
              {topStaker.payout ? `KES ${topStaker.payout.toFixed(2)}` : "-"}
            </span>
          </div>
        ))}

        {/* Optional Debug Line */}
        <div className="px-1 text-xs text-white/30 mt-2">
          Phase: {gamePhase}
        </div>
      </div>
    </div>
  );
};

export default LiveBetsBody;
