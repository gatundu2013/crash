import type {
  UserCashoutErrorRes,
  UserCashoutSuccessRes,
  UserPlaceBetErrorRes,
  UserPlaceBetSuccessRes,
} from "../../types/shared/socketIo/betTypes";

export interface BetStoreI {
  // State
  stake: number;
  hasAutoBet: boolean;
  hasAutoCashout: boolean;
  autoCashoutValue: number;
  isRequesting: boolean;
  hasScheduledBet: boolean;
  hasPlacedBet: boolean;
  betId: string | null;

  // Setters
  setStake: (stake: number) => void;
  setAutoBet: (hasAutoBet: boolean) => void;
  setAutoCashout: (hasAutoCashout: boolean) => void;
  setAutoCashoutValue: (autoCashoutValue: number) => void;

  // Actions
  placeBet: () => void;
  cashout: () => void;
  toggleScheduledBet: () => void;
  performBetAction: () => void; // Single action for UI button
  handleGamePhaseChange: () => void;
  resetBetState: () => void;

  // Computed
  canPlaceBet: () => boolean;
  canCashout: () => boolean;
  canScheduleBet: () => boolean;
  isPlaceButtonDisabled: () => boolean;
  areBetControlsDisabled: () => boolean;

  // Socket handlers
  handleBetSuccess: (data: UserPlaceBetSuccessRes) => void;
  handleBetFailure: (data: UserPlaceBetErrorRes) => void;
  handleCashoutSuccess: (data: UserCashoutSuccessRes) => void;
  handleCashoutFailure: (data: UserCashoutErrorRes) => void;

  // Socket lifecycle
  subscribeToSocketEvents: () => void;
  unsubscribeFromSocketEvents: () => void;
}
