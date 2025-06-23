import useGameStore from "@/stores/gameStore";

const LiveBetsHeader = () => {
  const totalBets = useGameStore((state) => state.totalBets);
  const numberOfCashouts = useGameStore((state) => state.numberOfCashouts);
  const totalBetAmount = useGameStore((state) => state.totalBetAmount);

  return (
    <div className="sticky top-0 space-y-1 z-10">
      {/* Summary bar */}
      <div className="bg-layer-2 py-2 px-3 flex justify-between items-center text-sm font-medium rounded-lg">
        <div className="flex items-center gap-2">
          <div className="relative w-3.5 h-3.5 rounded-full bg-green-500/25 flex items-center justify-center">
            <div className="absolute w-1 h-1 rounded-full bg-green-1 animate-pulse duration-1000" />
          </div>
          <span className="flex gap-1">
            {numberOfCashouts}/{totalBets} <span>Players</span>
          </span>
        </div>

        <span>KES {totalBetAmount.toFixed(2)}</span>
      </div>

      {/* Column labels */}
      <div className="grid grid-cols-4 px-1 text-[13px] text-white/70 font-medium">
        <span className="truncate">Player</span>
        <span>Stake</span>
        <span>x</span>
        <span className="flex items-baseline gap-1">
          <span>Payout</span>
          <span className="text-xs">KES</span>
        </span>
      </div>
    </div>
  );
};

export default LiveBetsHeader;
