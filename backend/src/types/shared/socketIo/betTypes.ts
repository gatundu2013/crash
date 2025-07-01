/**
 * ..... GLOBAL ......
 */
export interface TopStakers {
  username: string;
  betId: string;
  stake: number;
  payout: number | null;
  cashoutMultiplier: number | null;
}

/***
 * ........ BET ........
 */
export interface BettingPayload {
  stake: number;
  autoCashoutMultiplier: number | null;
  userId: string;
  clientSeed: string | null;
  username: string;
  storeId: string; // Indicates which trigger initiated the bet /  Prevent cross-listening
}

export interface BroadcastPlaceBetSuccessRes {
  totalBetAmount: number;
  topStakers: TopStakers[];
  totalBets: number;
}

export interface UserPlaceBetSuccessRes {
  betId: string;
  accountBalance: number;
}

export interface UserPlaceBetErrorRes {
  message: string;
}

/***
 * ........ CASHOUT ........
 */

export interface CashoutPayload {
  betId: string;
}

export interface BroadcastCashoutSuccessRes {
  topStakers?: TopStakers[];
  numberOfCashouts: number;
}

export interface UserCashoutSuccessRes {
  payout: number;
  multiplier: number;
  newAccountBalance: number;
}

export interface UserCashoutErrorRes {
  message: string;
}
