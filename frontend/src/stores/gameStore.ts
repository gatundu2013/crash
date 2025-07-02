import type { GameStoreI } from "@/types/frontend/game.types";
import { GamePhase } from "@/types/shared/socketIo/gameTypes";
import type {
  PreparingPhaseRes,
  RunningPhaseRes,
  EndPhaseRes,
  BettingPhaseRes,
  GamePhaseErrorRes,
  OnConnectRes,
  BroadcastCashoutSuccessRes,
  BroadcastPlaceBetSuccessRes,
} from "../types/shared/socketIo/gameTypes";
import { create } from "zustand";

const INITIAL_STATE = {
  gamePhase: GamePhase.PREPARING,
  hashedServerSeed: "",
  currentMultiplier: 1,
  finalMultiplier: 0,
  message: "",
  previousMultipliers: [],
  topStakers: [],
  countDown: 1,
  totalBets: 0,
  cashedOutBetsSize: 0,
  numberOfCashouts: 0,
  totalBetAmount: 0,
};

const useGameStore = create<GameStoreI>((set, get) => ({
  ...INITIAL_STATE,

  // PHASE HANDLERS
  handlePreparingPhase(data: PreparingPhaseRes) {
    if (!data) return;

    const { gamePhase, hashedServerSeed } = data;

    set({
      gamePhase,
      hashedServerSeed,
    });
  },

  handleRunningPhase(data: RunningPhaseRes) {
    if (!data?.currentMultiplier) return;

    set({
      gamePhase: GamePhase.RUNNING,
      currentMultiplier: data.currentMultiplier,
    });
  },

  handleEndPhase(data: EndPhaseRes) {
    if (!data) return;

    const { finalMultiplier, roundId, gamePhase } = data;
    const currentState = get();

    set({
      gamePhase,
      finalMultiplier,
      previousMultipliers: [
        { finalMultiplier, roundId },
        ...currentState.previousMultipliers,
      ],
    });
  },

  handleBettingPhase(data: BettingPhaseRes) {
    if (!data) return;

    const { gamePhase, countDown } = data;

    set({
      gamePhase,
      countDown: Math.max(0, countDown), // Ensure countdown is not negative
    });
  },

  handleErrorPhase(data: GamePhaseErrorRes) {
    if (!data) return;

    const { gamePhase, message } = data;

    set({
      gamePhase,
      message,
    });
  },

  handleBroadcastSuccessfulBets(data: BroadcastPlaceBetSuccessRes) {
    if (!data) return;

    const { totalBetAmount = 0, totalBets = 0, topStakers = [] } = data;

    set({
      totalBetAmount: Math.max(0, totalBetAmount),
      totalBets: Math.max(0, totalBets),
      topStakers,
    });
  },

  handleBroadcastSuccessfulCashouts(data: BroadcastCashoutSuccessRes) {
    if (!data) return;

    const { topStakers = [], numberOfCashouts = 0 } = data;

    set({
      topStakers,
      numberOfCashouts: Math.max(0, numberOfCashouts),
    });
  },

  onConnectData(data: OnConnectRes) {
    if (!data) return;

    const {
      topStakers = [],
      previousMultipliers = [],
      hashedServerSeed = "",
    } = data;

    set({
      topStakers,
      previousMultipliers,
      hashedServerSeed,
    });
  },

  resetLiveStats() {
    set({
      totalBetAmount: 0,
      numberOfCashouts: 0,
      cashedOutBetsSize: 0,
      totalBets: 0,
      topStakers: [],
    });
  },

  resetGameState() {
    set(INITIAL_STATE);
  },
}));

export default useGameStore;
