import HistoryImg from "../../assets/history.png";
import { format } from "date-fns";
import useFetch from "@/hooks/useFetch";
import { useEffect, useState, useRef } from "react";
import type { GetBetHistoryRes } from "@/types/betHistory.types";
import { API_ROUTES } from "@/config/apiRoutes.config";
import useAuthStore from "@/stores/authStore";
import { SubmitButton } from "@/components/forms";
import Avatar from "../../assets/avatar.png";
import { toast } from "react-toastify";

const BetHistory = () => {
  const { isLoading, getData } = useFetch();
  const [bets, setBets] = useState<GetBetHistoryRes[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.userData?.userId);
  const hasInitialLoadRef = useRef(false); // Prevents duplicate initial loads

  async function fetchPaginatedBetHistory(isInitialLoad = false) {
    if (isAuthenticated && userId) {
      const resp = await getData(
        API_ROUTES.BET_HISTORY.PAGINATED_HISTORY({
          userId,
          page: currentPage,
        })
      );

      const data: GetBetHistoryRes[] = resp.betHistories;

      if (isInitialLoad) {
        setBets(data);
      } else {
        if (data.length === 0) {
          toast.info("No more");
          return;
        }
        setBets((prev) => [...prev, ...data]);
        setCurrentPage((prev) => prev + 1);
      }
    }
  }

  // Fetch first page on initial load
  useEffect(() => {
    if (isAuthenticated && bets.length === 0 && !hasInitialLoadRef.current) {
      hasInitialLoadRef.current = true;
      fetchPaginatedBetHistory(true);
    }
  }, [isAuthenticated]);

  return (
    <div className="max-w-[550px] mx-auto relative flex flex-col pb-4">
      {/* Header */}
      <div className="sticky top-[62px] z-10 bg-layer-1 pb-2 space-y-2">
        <div className="flex flex-col items-center">
          <div className="w-9 h-9">
            <img
              src={HistoryImg}
              alt="history"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-lg font-medium text-white">Your Bet History</h1>
        </div>

        <div className="grid grid-cols-4 gap-4 bg-layer-4 px-2 py-2 rounded-lg text-white/90 text-sm">
          <span>Date</span>
          <span>Stake</span>
          <span>Multiplier</span>
          <span>Payout</span>
        </div>
      </div>

      {/* Bet Rows */}
      <div className="flex flex-col space-y-2 mb-3">
        {/* Loading state (first load only) */}
        {isLoading && bets.length === 0 && (
          <p className="text-center text-white/70 text-sm">Loading...</p>
        )}

        {/* No bets found */}
        {!isLoading && bets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-white/60">
            <img
              src={Avatar}
              alt="No history"
              className="w-16 h-16 object-contain opacity-50 mb-3"
            />
            <p className="text-sm">No bet history</p>
          </div>
        )}

        {/* List of bets */}
        {bets.map((bet, index) => {
          const dateObj = new Date(bet.createdAt);
          const date = format(dateObj, "dd/MM/yyyy");
          const time = format(dateObj, "HH:mm:ss");

          const stake = bet.stake?.toFixed(2) ?? "-";
          const multiplier =
            bet.cashoutMultiplier?.toFixed(2) ??
            bet.finalMultiplier?.toFixed(2) ??
            "-";
          const payout = bet.payout != null ? bet.payout.toFixed(2) : "-";
          const isWin = bet.payout;

          return (
            <div
              className={`grid grid-cols-4 gap-4 items-center text-xs px-2 rounded-lg py-1 font-semibold ${
                isWin
                  ? "bg-green-500/10 text-green-500"
                  : "bg-white/5 text-white/90"
              }`}
              key={index}
            >
              <div className="flex flex-col leading-tight space-y-0.5">
                <span className="text-white/65">{date}</span>
                <span>{time}hrs</span>
              </div>

              <div className="text-white/90">{stake}</div>
              <div className="text-pink-500 font-medium">{multiplier}x</div>
              <div className="text-green-1 font-semibold">{payout}</div>
            </div>
          );
        })}
      </div>

      {/* Load More button */}
      {bets.length > 0 && (
        <SubmitButton
          className="self-center"
          isLoading={isLoading}
          onClick={() => fetchPaginatedBetHistory(false)}
        >
          Load More
        </SubmitButton>
      )}
    </div>
  );
};

export default BetHistory;
