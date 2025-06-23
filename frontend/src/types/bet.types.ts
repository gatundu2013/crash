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
  handleBetSuccess: (data: SuccessfulBetRes) => void;
  handleBetFailure: (data?: { message: string }) => void;
  handleCashoutSuccess: (data: SuccessfulCashoutRes) => void;
  handleCashoutFailure: (data?: { message: string }) => void;

  // Socket lifecycle
  subscribeToSocketEvents: () => void;
  unsubscribeFromSocketEvents: () => void;
}

export interface BettingPayload {
  stake: number;
  autoCashoutMultiplier: number | null;
  userId: string;
  clientSeed: string | null;
  username: string;
  storeId: string; // used to identify events
}

export interface CashoutPayload {
  betId: string;
}

export interface SuccessfulBetRes {
  betId: string;
  accountBalance: number;
}

export interface SuccessfulCashoutRes {
  payout: number;
  multiplier: number;
  newAccountBalance: number;
}
