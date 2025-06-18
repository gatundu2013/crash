import { GAME_CONFIG } from "@/config/game.config";
import { create } from "zustand";
import { GamePhase } from "@/types/game.types";
import useGameStore from "./gameStore";
import useAuthStore from "./authStore";
import useSocketStore from "./socketStore";
import { toast } from "react-toastify";
import type {
  BetStoreI,
  BettingPayload,
  CashoutPayload,
  SuccessfulBetRes,
  SuccessfulCashoutRes,
} from "@/types/bet.types";
import { SOCKET_EVENTS } from "@/config/socketEvents.config";
import { cashoutSuccessToaster } from "@/components/toasters";

const initialState = {
  stake: GAME_CONFIG.MIN_STAKE,
  hasAutoBet: false,
  hasAutoCashout: false,
  autoCashoutValue: GAME_CONFIG.MIN_AUTO_CASHOUT_VALUE,
  isRequesting: false,
  hasScheduledBet: false,
  hasPlacedBet: false,
  betId: null,
};

const createBetStore = (storeId: string) => {
  return create<BetStoreI>((set, get) => ({
    ...initialState,

    // Setters
    setStake: (stake) => set({ stake }),
    setAutoBet: (hasAutoBet) => set({ hasAutoBet }),
    setAutoCashout: (hasAutoCashout) => set({ hasAutoCashout }),
    setAutoCashoutValue: (autoCashoutValue) => set({ autoCashoutValue }),

    // Computed properties
    canPlaceBet: () => {
      const gamePhase = useGameStore.getState().gamePhase;
      const { isRequesting, hasPlacedBet } = get();
      return gamePhase === GamePhase.BETTING && !hasPlacedBet && !isRequesting;
    },

    canCashout: () => {
      const gamePhase = useGameStore.getState().gamePhase;
      const { isRequesting, hasPlacedBet } = get();
      return gamePhase === GamePhase.RUNNING && hasPlacedBet && !isRequesting;
    },

    canScheduleBet: () => {
      const gamePhase = useGameStore.getState().gamePhase;
      const { isRequesting, hasPlacedBet } = get();
      return (
        !isRequesting &&
        !hasPlacedBet &&
        (gamePhase === GamePhase.RUNNING || gamePhase === GamePhase.END)
      );
    },

    isPlaceButtonDisabled: () => {
      const { isRequesting, hasPlacedBet } = get();
      const gamePhase = useGameStore.getState().gamePhase;
      return isRequesting || (hasPlacedBet && gamePhase === GamePhase.BETTING);
    },

    areBetControlsDisabled: () => {
      const { hasPlacedBet, hasScheduledBet } = get();
      return get().isPlaceButtonDisabled() || hasScheduledBet || hasPlacedBet;
    },

    // Actions
    placeBet: () => {
      const { stake, hasAutoCashout, autoCashoutValue } = get();
      const { isAuthenticated, userData } = useAuthStore.getState();
      const socket = useSocketStore.getState().socket;

      if (!isAuthenticated || !userData) {
        toast.error("Login required");
        return;
      }

      if (!socket) {
        toast.error("Connection error. Please try again.");
        return;
      }

      const betPayload: BettingPayload = {
        stake,
        autoCashoutMultiplier: hasAutoCashout ? autoCashoutValue : null,
        userId: userData.userId,
        clientSeed: "",
        username: userData.username,
        storeId,
      };

      set({ isRequesting: true });
      socket.emit(SOCKET_EVENTS.EMITTERS.BETTING.PLACE_BET, betPayload);
    },

    cashout: () => {
      const { betId } = get();
      const socket = useSocketStore.getState().socket;

      if (!betId || !socket) return;

      set({ isRequesting: true });

      const cashoutPayload: CashoutPayload = {
        betId,
      };

      socket.emit(SOCKET_EVENTS.EMITTERS.BETTING.CASHOUT, cashoutPayload);
    },

    toggleScheduledBet: () => {
      const { isAuthenticated } = useAuthStore.getState();
      const socket = useSocketStore.getState().socket;

      if (!isAuthenticated) {
        toast.error("Login required");
        return;
      }

      if (!socket) {
        toast.error("Connection error. Refresh page");
        return;
      }

      set((state) => ({ hasScheduledBet: !state.hasScheduledBet }));
    },

    // Main action for UI button - determines what to do based on current state
    performBetAction: () => {
      const {
        canPlaceBet,
        canCashout,
        canScheduleBet,
        placeBet,
        cashout,
        toggleScheduledBet,
      } = get();

      if (canPlaceBet()) {
        placeBet();
      } else if (canCashout()) {
        cashout();
      } else if (canScheduleBet()) {
        toggleScheduledBet();
      }
    },

    handleGamePhaseChange: () => {
      const {
        hasPlacedBet,
        hasScheduledBet,
        hasAutoBet,
        canPlaceBet,
        resetBetState,
        placeBet,
      } = get();
      const gamePhase = useGameStore.getState().gamePhase;

      // Reset state when round ends
      if (gamePhase === GamePhase.END && hasPlacedBet) {
        resetBetState();
      }

      // Auto-place bet when new round starts and conditions are meet
      if (gamePhase === GamePhase.BETTING && (hasScheduledBet || hasAutoBet)) {
        if (canPlaceBet()) {
          placeBet();
        }
      }
    },

    resetBetState: () => {
      set({
        isRequesting: false,
        hasScheduledBet: false,
        hasPlacedBet: false,
        betId: null,
      });
    },

    // Socket event handlers
    handleBetSuccess: (data: SuccessfulBetRes) => {
      const { betId, accountBalance } = data;
      const { updateUserData } = useAuthStore.getState();

      set({
        betId,
        isRequesting: false,
        hasPlacedBet: true,
        hasScheduledBet: false,
      });

      updateUserData({ accountBalance });
    },

    handleBetFailure: (data) => {
      set({
        isRequesting: false,
        hasPlacedBet: false,
        hasScheduledBet: false,
        betId: null,
      });

      if (data?.message) {
        toast.error(data.message);
      }
    },

    handleCashoutSuccess: (data: SuccessfulCashoutRes) => {
      const updateUserData = useAuthStore.getState().updateUserData;

      console.log("CALLEDDDD");

      cashoutSuccessToaster({
        cashoutMultiplier: data.multiplier,
        payout: data.payout,
      });

      set({
        isRequesting: false,
        hasPlacedBet: false,
        hasScheduledBet: false,
        betId: null,
      });
      updateUserData({ accountBalance: data.newAccountBalance });
    },

    handleCashoutFailure: (data) => {
      set({
        isRequesting: false,
        hasPlacedBet: false,
        hasScheduledBet: false,
        betId: null,
      });

      const message = data?.message || "Cashout failed";
      toast.error(message);
    },

    // Socket event management
    subscribeToSocketEvents: () => {
      const socket = useSocketStore.getState().socket;
      if (!socket) return;

      const {
        handleBetSuccess,
        handleBetFailure,
        handleCashoutSuccess,
        handleCashoutFailure,
      } = get();

      // Subscribe to bet events
      socket.on(
        SOCKET_EVENTS.LISTENERS.BETTING.PLACE_BET_SUCCESS(storeId),
        handleBetSuccess
      );
      socket.on(
        SOCKET_EVENTS.LISTENERS.BETTING.PLACE_BET_ERROR(storeId),
        handleBetFailure
      );

      // Subscribe to cashout events if we have a bet
      const { betId } = get();
      if (betId) {
        socket.on(
          SOCKET_EVENTS.LISTENERS.BETTING.CASHOUT_SUCCESS(betId),
          handleCashoutSuccess
        );
        socket.on(
          SOCKET_EVENTS.LISTENERS.BETTING.CASHOUT_ERROR(betId),
          handleCashoutFailure
        );
      }
    },

    unsubscribeFromSocketEvents: () => {
      const socket = useSocketStore.getState().socket;
      if (!socket) return;

      // Unsubscribe from bet events
      socket.off(SOCKET_EVENTS.LISTENERS.BETTING.PLACE_BET_SUCCESS(storeId));
      socket.off(SOCKET_EVENTS.LISTENERS.BETTING.PLACE_BET_ERROR(storeId));

      // Unsubscribe from cashout events
      const { betId } = get();
      if (betId) {
        socket.off(SOCKET_EVENTS.LISTENERS.BETTING.CASHOUT_SUCCESS(betId));
        socket.off(SOCKET_EVENTS.LISTENERS.BETTING.CASHOUT_ERROR(betId));
      }
    },
  }));
};

// Create store instances
export const betStores = [
  { id: 1, useStore: createBetStore("1") },
  { id: 2, useStore: createBetStore("2") },
];
