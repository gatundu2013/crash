import StakeInput from "./StakeInput";
import QuickStakes from "./QuickStakes";
import BetButton from "./BetButton";
import Autos from "./Autos";
import type { StoreApi, UseBoundStore } from "zustand";
import type { BetStoreI } from "@/stores/betStore";

interface BetControllerProps {
  useStore: UseBoundStore<StoreApi<BetStoreI>>;
}

const BetController = ({ useStore }: BetControllerProps) => {
  const betStore = useStore();

  const containerClasses = "max-w-[350px] mx-auto px-2";

  return (
    <div className="bg-layer-4 w-full flex-1 pt-3 rounded-xl">
      <div className={`${containerClasses} space-y-2`}>
        <div className="space-y-1">
          <StakeInput
            stake={betStore.stake}
            setStake={betStore.setStake}
            areBetControlsDisabled={betStore.areBetControlsDisabled}
          />
          <QuickStakes
            setStake={betStore.setStake}
            areBetControlsDisabled={betStore.areBetControlsDisabled}
          />
        </div>

        <BetButton {...betStore} />
      </div>

      <div className="border-t border-white/10 mt-2.5 py-2">
        <div className={containerClasses}>
          <Autos
            autoCashoutValue={betStore.autoCashoutValue}
            hasAutoBet={betStore.hasAutoBet}
            hasAutoCashout={betStore.hasAutoCashout}
            setAutoCashoutValue={betStore.setAutoCashoutValue}
            setAutoBet={betStore.setAutoBet}
            setAutoCashout={betStore.setAutoCashout}
            areBetControlsDisabled={betStore.areBetControlsDisabled}
          />
        </div>
      </div>
    </div>
  );
};

export default BetController;
