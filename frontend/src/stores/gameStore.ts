import {
  GamePhase,
  type GameStoreI,
  type PreparingPhaseData,
  type RunningPhaseData,
  type EndPhaseData,
  type BettingPhaseData,
  type ErrorPhaseData,
  type BroadcastBetRes,
  type BroadcastCashoutRes,
  type BroadcastHashedServerSeed,
} from "@/types/game.types";
import { create } from "zustand";

const useGameStore = create<GameStoreI>((set) => ({
  gamePhase: GamePhase.IDLE,
  hashedServerSeed: "",
  currentMultiplier: 1,
  finalCrashPoint: 0,
  message: "",
  previousMultipliers: [],
  topStakers: [],
  countDown: 1,
  totalBets: 0,
  cashedOutBetsSize: 0,
  numberOfCashouts: 0,
  totalBetAmount: 0,

  // PHASE HANDLERS

  handlePreparingPhase(data: PreparingPhaseData) {
    set({
      gamePhase: GamePhase.PREPARING,
    });
  },

  handleRunningPhase(data: RunningPhaseData) {
    set({
      gamePhase: GamePhase.RUNNING,
      currentMultiplier: data?.currentMultiplier,
    });
  },

  handleEndPhase(data: EndPhaseData) {
    set({
      gamePhase: GamePhase.END,
      finalCrashPoint: data?.finalCrashPoint,
    });
  },

  handleBettingPhase(data: BettingPhaseData) {
    set({
      gamePhase: GamePhase.BETTING,
      countDown: data?.countDown,
    });
  },

  handleErrorPhase(data: ErrorPhaseData) {
    set({
      gamePhase: GamePhase.ERROR,
      message: data?.message,
    });
  },

  handleBroadcastHashedServerSeed(data: BroadcastHashedServerSeed) {
    set({
      hashedServerSeed: data?.hashedServerSeed,
    });
  },

  handleBroadcastSuccessfulBets(data: BroadcastBetRes) {
    set({
      totalBetAmount: data.totalBetAmount ?? 0,
      totalBets: data.totalBets ?? 0,
      topStakers: data.topStakers ?? [],
    });
  },

  handleBroadcastSuccessfulCashouts(data: BroadcastCashoutRes) {
    set({
      topStakers: data.topStakers ?? [],
      numberOfCashouts: data?.numberOfCashouts ?? 0,
    });
  },
}));

export default useGameStore;
