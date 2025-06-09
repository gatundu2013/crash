import { create } from "zustand";
import { GamePhase, type GameStoreI } from "../types/game.types";

const useGameStore = create<GameStoreI>((set) => ({
  gamePhase: GamePhase.IDLE,
  hashedServerSeed: "",
  currentMultiplier: 1,
  finalCrashPoint: 0,
  message: "",
  previousMultipliers: [],
  topStakers: [],
  countDown: 1,
  allBetsSize: 0,
  cashedOutBetsSize: 0,
  totalBetAmount: 0,

  // PHASE HANDLERS
  handlePreparingPhase(hashedServerSeed: string) {
    set({
      gamePhase: GamePhase.PREPARING,
      hashedServerSeed,
    });
  },
  handleRunningPhase(currentMultiplier: number) {
    set({
      gamePhase: GamePhase.RUNNING,
      currentMultiplier,
    });
  },
  handleEndPhase(finalCrashPoint: number) {
    set({
      gamePhase: GamePhase.END,
      finalCrashPoint,
    });
  },
  handleBettingPhase(countDown: number) {
    set({
      gamePhase: GamePhase.BETTING,
      countDown,
    });
  },
  handleErrorPhase(message: string) {
    set({
      gamePhase: GamePhase.ERROR,
      message,
    });
  },
}));

export default useGameStore;
