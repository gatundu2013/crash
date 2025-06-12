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
  const store = useStore();

  // Shared container styles
  const containerClass = "max-w-[350px] mx-auto px-2";

  return (
    <div className="bg-layer-4 w-full flex-1 pt-3 rounded-xl">
      <div className={`${containerClass} space-y-2`}>
        <div className="space-y-1">
          <StakeInput stake={store.stake} setStake={store.setStake} />
          <QuickStakes setStake={store.setStake} />
        </div>

        <BetButton
          stake={store.stake}
          autoCashoutValue={store.autoCashoutValue}
          hasAutoCashout={store.hasAutoCashout}
        />
      </div>

      <div className="border-t border-white/10 mt-2.5 py-2">
        <div className={containerClass}>
          <Autos
            autoCashoutValue={store.autoCashoutValue}
            hasAutoBet={store.hasAutoBet}
            hasAutoCashout={store.hasAutoCashout}
            setAutoCashoutValue={store.setAutoCashoutValue}
            setAutoBet={store.setAutoBet}
            setAutoCashout={store.setAutoCashout}
          />
        </div>
      </div>
    </div>
  );
};

export default BetController;
