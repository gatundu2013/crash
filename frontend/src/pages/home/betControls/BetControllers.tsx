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

  return (
    <div className="w-full bg-layer-4 rounded-xl px-3 py-3 flex flex-col space-y-3">
      <div className="w-full lg:w-[73%] mx-auto flex flex-col space-y-2 flex-1 rounded-lg">
        <StakeInput stake={store.stake} setStake={store.setStake} />
        <QuickStakes setStake={store.setStake} />
        <BetButton stake={store.stake} />
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
  );
};

export default BetController;
