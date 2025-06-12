import { GAME_CONFIG } from "@/config/game.config";
import { create } from "zustand";
import { GamePhase } from "@/types/game.types";

export interface BetStoreI {
  stake: number;
  hasAutoBet: boolean;
  hasAutoCashout: boolean;
  autoCashoutValue: number;
  isRequesting: boolean;
  hasScheduledBet: boolean;
  hasPlacedBet: boolean;
  betId: string | null;

  setStake: (stake: number) => void;
  setAutoBet: (hasAutoBet: boolean) => void;
  setAutoCashout: (hasAutoCashout: boolean) => void;
  setAutoCashoutValue: (autoCashoutValue: number) => void;
  setIsRequesting: (isRequesting: boolean) => void;
  setHasScheduledBet: (hasScheduledBet: boolean) => void;
  setHasPlacedBet: (hasPlacedBet: boolean) => void;
  getValidBetAction: (gamePhase: GamePhase) => {
    canPlaceBet: boolean;
    canScheduleBet: boolean;
    canCashout: boolean;
  };
  performBetAction: ({
    gamePhase,
    placeBet,
    cashout,
  }: {
    gamePhase: GamePhase;
    placeBet: () => void;
    cashout: () => void;
  }) => void;
  onBetSuccess: (betId: string) => void;
  onBetFailure: () => void;
  onCashoutSuccess: () => void;
  onCashoutFailure: () => void;
  resetBetState: () => void;
}

const intialBetState = {
  stake: GAME_CONFIG.MIN_STAKE,
  hasAutoBet: false,
  hasAutoCashout: false,
  autoCashoutValue: GAME_CONFIG.MIN_AUTO_CASHOUT_VALUE,
  isRequesting: false,
  hasScheduledBet: false,
  hasPlacedBet: false,
  betId: null,
};

//factory function
const createBetStore = () => {
  return create<BetStoreI>((set, get) => ({
    ...intialBetState,

    performBetAction({
      gamePhase,
      placeBet,
      cashout,
    }: {
      gamePhase: GamePhase;
      placeBet: () => void;
      cashout: () => void;
    }) {
      const betActions = get().getValidBetAction(gamePhase);

      if (betActions.canPlaceBet) {
        if (typeof placeBet !== "function") return;
        placeBet();
        return;
      }

      if (betActions.canCashout) {
        if (typeof placeBet === "function") return;
        cashout();
        return;
      }

      if (betActions.canScheduleBet) {
        set((state) => ({ hasScheduledBet: !state.hasScheduledBet }));
        return;
      }
    },

    getValidBetAction(gamePhase) {
      const betActions = {
        canPlaceBet: false,
        canScheduleBet: false,
        canCashout: false,
      };

      if (this.isRequesting) betActions;

      const canPlaceBet = gamePhase === GamePhase.BETTING;
      const canCashout = gamePhase === GamePhase.RUNNING && this.hasPlacedBet;
      const canScheduleBet =
        (gamePhase === GamePhase.RUNNING && !this.hasPlacedBet) ||
        gamePhase === GamePhase.END;

      return {
        canScheduleBet,
        canPlaceBet,
        canCashout,
      };
    },

    onBetSuccess(betId: string) {
      set({
        betId: betId,
        isRequesting: false,
        hasPlacedBet: true,
        hasScheduledBet: false,
      });
    },

    onBetFailure() {
      set({
        isRequesting: false,
      });
    },

    onCashoutSuccess() {
      set({
        isRequesting: false,
        hasPlacedBet: false,
        betId: null,
      });
    },

    onCashoutFailure() {
      set({ isRequesting: false });
    },

    resetBetState() {
      set({ ...intialBetState });
    },

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
    setIsRequesting(isRequesting: boolean) {
      set({ isRequesting });
    },
    setHasScheduledBet(hasScheduledBet: boolean) {
      set({ hasScheduledBet });
    },
    setHasPlacedBet(hasPlacedBet: boolean) {
      set({ hasPlacedBet });
    },
  }));
};

//Two bet buttons
export const betStores = [
  { id: 1, useStore: createBetStore() },
  { id: 2, useStore: createBetStore() },
];
