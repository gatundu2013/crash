import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RiHistoryLine } from "react-icons/ri";

import useGameStore from "@/stores/gameStore";
import PreviousMultiplier from "./PreviousMultiplier";

const PreviousMultipliers = () => {
  const previousMultipliers = useGameStore(
    (state) => state.previousMultipliers
  );

  return (
    <div className="w-full bg-layer-3 px-2 py-1 rounded-lg mx-auto flex gap-2 items-center">
      {/* Horizontal List */}
      <div className="w-full overflow-x-hidden flex-1">
        <div className="flex px-4 gap-4 min-w-max">
          {previousMultipliers?.map((value) => (
            <PreviousMultiplier
              key={value.roundId}
              finalMultiplier={value.finalMultiplier}
              roundId={value.roundId}
            />
          ))}
        </div>
      </div>

      {/* History Dialog*/}
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className="bg-layer-5 flex-shrink-0"
          >
            <RiHistoryLine />
          </Button>
        </DialogTrigger>

        <DialogContent className="bg-layer-1 border border-layer-3">
          <DialogHeader>
            <DialogTitle>History</DialogTitle>
            <DialogDescription className="hidden" />
          </DialogHeader>

          {/* Grid Layout for History */}
          <div className="flex justify-center flex-wrap gap-4 py-2">
            {previousMultipliers?.map((value) => (
              <div
                key={value.roundId}
                className="bg-layer-3 rounded-lg flex justify-center items-center"
              >
                <PreviousMultiplier
                  finalMultiplier={value.finalMultiplier}
                  roundId={value.roundId}
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PreviousMultipliers;
