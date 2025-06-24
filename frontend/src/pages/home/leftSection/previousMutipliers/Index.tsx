import { RiHistoryLine } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import useGameStore from "@/stores/gameStore";

const PreviousMultipliers = () => {
  const previousMultipliers = useGameStore(
    (state) => state.previousMultipliers
  );

  return (
    <div className="w-full bg-layer-3 px-2 py-1 rounded-lg mx-auto flex gap-2 items-center">
      <div className="w-full overflow-x-hidden flex-1">
        <div className="flex px-4 gap-4 min-w-max">
          {previousMultipliers?.map((value, index) => (
            <div
              key={index}
              className={cn(
                "text-sm font-semibold px-2.5 cursor-pointer relative text-orange-1",
                value?.finalMultiplier > 2 && "text-green-1"
              )}
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full inline-block mr-1 absolute -left-[0.5px] bg-orange-1",
                  value?.finalMultiplier > 2 && "bg-green-1"
                )}
              ></span>
              <span className={`animate-scale-up`}>
                {value?.finalMultiplier.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        className="bg-layer-5 flex-shrink-0"
      >
        <RiHistoryLine />
      </Button>
    </div>
  );
};

export default PreviousMultipliers;
