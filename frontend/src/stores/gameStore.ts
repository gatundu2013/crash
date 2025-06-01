import { create } from "zustand";

interface GameStoreI {
  currentMultiplier: number;

  setCurrentMultiplier: (multiplier: number) => void;
}

const useGameStore = create<GameStoreI>((set) => ({
  currentMultiplier: 1,
  setCurrentMultiplier(multiplier: number) {
    set({ currentMultiplier: multiplier });
  },
}));

export default useGameStore;
