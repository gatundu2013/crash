import { create } from "zustand";

export interface BetStoreI {
  stake: number;
  hasAutoBet: boolean;
  hasAutoCashout: boolean;
  autoCashoutValue: number;

  setStake: (stake: number) => void;
  setAutoBet: (hasAutoBet: boolean) => void;
  setAutoCashout: (hasAutoCashout: boolean) => void;
  setAutoCashoutValue: (autoCashoutValue: number) => void;
}

//factory function
const createBetStore = () => {
  return create<BetStoreI>((set) => ({
    stake: 10,
    hasAutoBet: false,
    hasAutoCashout: false,
    autoCashoutValue: 1.01,

    setStake(stake: number) {
      set({ stake });
    },
    setAutoBet(hasAutoBet: boolean) {
      set({ hasAutoBet });
    },
    setAutoCashout(hasAutoCashout: boolean) {
      set({ hasAutoCashout });
    },
    setAutoCashoutValue(autoCashoutValue: number) {
      set({ autoCashoutValue });
    },
  }));
};

//Two bet buttons
export const betStores = [
  { id: 1, useStore: createBetStore() },
  { id: 2, useStore: createBetStore() },
];
