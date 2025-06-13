import { GAME_CONFIG } from "@/config/game.config";
import { create } from "zustand";
import { GamePhase } from "@/types/game.types";
import useGameStore from "./gameStore";
import useAuthStore from "./authStore";
import useSocketStore from "./socketStore";
import { toast } from "react-toastify";
import type { BettingPayload, SuccessfulBetRes } from "@/types/bet.types";
import { SOCKET_EVENTS } from "@/config/socketEvents.config";

export interface BetStoreI {
  stake: number; // Current bet amount
  hasAutoBet: boolean; // Whether auto-bet is enabled
  hasAutoCashout: boolean; // Whether auto-cashout is enabled
  autoCashoutValue: number; // Auto-cashout multiplier value
  isRequesting: boolean; // Flag indicating a request is in progress
  hasScheduledBet: boolean; // If a bet is scheduled for the next round
  hasPlacedBet: boolean; // If a bet was placed in current round
  betId: string | null; // Current bet ID if placed

  setStake: (stake: number) => void;
  setAutoBet: (hasAutoBet: boolean) => void;
  setAutoCashout: (hasAutoCashout: boolean) => void;
  setAutoCashoutValue: (autoCashoutValue: number) => void;
  setIsRequesting: (isRequesting: boolean) => void;
  setHasScheduledBet: (hasScheduledBet: boolean) => void;
  setHasPlacedBet: (hasPlacedBet: boolean) => void;

  getValidBetAction: () => {
    canPlaceBet: boolean;
    canScheduleBet: boolean;
    canCashout: boolean;
  };

  areBetControlsDisabled: () => {
    isPlaceBetButtonDisabled: boolean;
    areOtherBetControlsDisabled: boolean;
  };

  // Called by UI to perform action (place, schedule, or cashout)
  performBetAction: () => void;

  // Called on game phase change to trigger automatic actions
  handleGamePhaseChange: () => void;

  handleBetSuccess: (data: SuccessfulBetRes) => void;
  handleBetFailure: (data?: { message: string }) => void;
  onCashoutSucess: () => void;
  resetBetState: () => void;

  // Lifecycle socket subscriptions
  subscribeToBetSocketEvents: () => void;
  unsubscribeFromBetSocketEvents: () => void;
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

// Factory to create isolated bet stores
const createBetStore = (storeId: string) => {
  return create<BetStoreI>((set, get) => ({
    ...intialBetState,

    setStake: (stake) => set({ stake }),
    setAutoBet: (hasAutoBet) => set({ hasAutoBet }),
    setAutoCashout: (hasAutoCashout) => set({ hasAutoCashout }),
    setAutoCashoutValue: (autoCashoutValue) => set({ autoCashoutValue }),
    setIsRequesting: (isRequesting) => set({ isRequesting }),
    setHasScheduledBet: (hasScheduledBet) => set({ hasScheduledBet }),
    setHasPlacedBet: (hasPlacedBet) => set({ hasPlacedBet }),

    // Computes which bet-related actions are currently allowed
    getValidBetAction() {
      const gamePhase = useGameStore.getState().gamePhase;
      const { isRequesting, hasPlacedBet } = get();

      if (isRequesting) {
        return {
          canPlaceBet: false,
          canScheduleBet: false,
          canCashout: false,
        };
      }

      const canPlaceBet = gamePhase === GamePhase.BETTING && !hasPlacedBet;
      const canCashout = gamePhase === GamePhase.RUNNING && hasPlacedBet;
      const canScheduleBet =
        (gamePhase === GamePhase.RUNNING && !hasPlacedBet) ||
        gamePhase === GamePhase.END;

      return { canPlaceBet, canScheduleBet, canCashout };
    },

    // Computes if controls should be disabled based on bet status
    areBetControlsDisabled() {
      const { isRequesting, hasPlacedBet, hasScheduledBet } = get();
      const gamePhase = useGameStore.getState().gamePhase;

      const isPlaceBetButtonDisabled =
        isRequesting || (hasPlacedBet && gamePhase === GamePhase.BETTING);

      const areOtherBetControlsDisabled =
        isPlaceBetButtonDisabled || hasScheduledBet || hasPlacedBet;

      return {
        isPlaceBetButtonDisabled,
        areOtherBetControlsDisabled,
      };
    },

    // UI action handler (place bet, cashout, or schedule)
    performBetAction() {
      const {
        stake,
        hasAutoCashout,
        autoCashoutValue,
        getValidBetAction,
        handleBetFailure,
      } = get();
      const { isAuthenticated, userData } = useAuthStore.getState();
      const socket = useSocketStore.getState().socket;
      const betActions = getValidBetAction();

      switch (true) {
        case betActions.canPlaceBet:
          if (!isAuthenticated || !userData) {
            handleBetFailure({ message: "Login required" });
            return;
          }

          if (!socket) {
            handleBetFailure({
              message: "Connection error. Please try again.",
            });
            return;
          }

          const bettingPayload: BettingPayload = {
            stake,
            autoCashoutMultiplier: hasAutoCashout ? autoCashoutValue : null,
            userId: userData.userId,
            clientSeed: "",
            username: userData.username,
            storeId,
          };

          set({ isRequesting: true });
          socket.emit(SOCKET_EVENTS.EMITTERS.BETTING.PLACE_BET, bettingPayload);
          break;

        case betActions.canCashout:
          set({ hasPlacedBet: false, betId: null });
          break;

        case betActions.canScheduleBet:
          if (!isAuthenticated || !userData) {
            toast.error("Login required");
            return;
          }

          if (!socket) {
            toast.error("Connection error. Refresh Page");
            return;
          }

          set((state) => ({ hasScheduledBet: !state.hasScheduledBet }));
          break;
      }
    },

    // Responds to phase changes for auto-bet or reset
    handleGamePhaseChange() {
      const {
        hasPlacedBet,
        hasScheduledBet,
        hasAutoBet,
        resetBetState,
        performBetAction,
      } = get();
      const gamePhase = useGameStore.getState().gamePhase;

      if (gamePhase === GamePhase.END && hasPlacedBet) {
        resetBetState();
      }

      if (gamePhase === GamePhase.BETTING && (hasScheduledBet || hasAutoBet)) {
        performBetAction();
      }
    },

    // Handles successful bet response
    handleBetSuccess(data) {
      const { betId, accountBalance } = data;
      const updateUserData = useAuthStore.getState().updateUserData;

      set({
        betId,
        isRequesting: false,
        hasPlacedBet: true,
        hasScheduledBet: false,
      });

      updateUserData({ accountBalance });
    },

    // Handles failed bet response
    handleBetFailure(data) {
      set({
        isRequesting: false,
        hasPlacedBet: false,
        hasScheduledBet: false,
        betId: null,
        hasAutoBet: false,
        hasAutoCashout: false,
      });

      if (data?.message) {
        toast.error(data.message);
      }
    },

    // Cleanup after cashout
    onCashoutSucess() {
      set({
        isRequesting: false,
        hasPlacedBet: false,
        betId: null,
        hasScheduledBet: false,
      });
    },

    // Resets bet state when round ends
    resetBetState() {
      set({
        isRequesting: false,
        hasScheduledBet: false,
        betId: null,
        hasPlacedBet: false,
      });
    },

    // Attaches socket listeners for bet success/failure
    subscribeToBetSocketEvents() {
      const socket = useSocketStore.getState().socket;
      const { handleBetSuccess, handleBetFailure } = get();

      if (!socket) return;

      socket.on(
        SOCKET_EVENTS.LISTENERS.BETTING.PLACE_BET_SUCCESS(storeId),
        handleBetSuccess
      );
      socket.on(
        SOCKET_EVENTS.LISTENERS.BETTING.PLACE_BET_ERROR(storeId),
        handleBetFailure
      );
    },

    // Removes listeners
    unsubscribeFromBetSocketEvents() {
      const socket = useSocketStore.getState().socket;

      if (!socket) return;

      socket.off(SOCKET_EVENTS.LISTENERS.BETTING.PLACE_BET_SUCCESS(storeId));
      socket.off(SOCKET_EVENTS.LISTENERS.BETTING.PLACE_BET_ERROR(storeId));
    },
  }));
};

export const betStores = [
  { id: 1, useStore: createBetStore("1") },
  { id: 2, useStore: createBetStore("2") },
];
