import HistoryImg from "../../assets/history.png";
import Avatar from "../../assets/avatar.png";
import { format } from "date-fns";
import useFetch from "@/hooks/useFetch";
import { useEffect, useState, useRef } from "react";
import { USER_API_ROUTES } from "@/config/apiRoutes.config";
import useAuthStore from "@/stores/authStore";
import { SubmitButton } from "@/components/forms";
import { toast } from "react-toastify";
import type { GetBetHistoryRes } from "@/types/shared/api/betHistoryTypes";

const BetHistory = () => {
  const { isLoading, fetchData } = useFetch<GetBetHistoryRes[]>();
  const [betHistories, setBetHistories] = useState<GetBetHistoryRes[]>([]);
  const currentPageRef = useRef(1);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.userData?.userId);

  const handleFetchMore = async () => {
    if (!isAuthenticated || !userId) {
      toast.error("Login required");
      return;
    }

    const result = await fetchData(
      USER_API_ROUTES.BET.PAGINATED_HISTORY({
        userId,
        page: currentPageRef.current,
      })
    );

    if (result?.length) {
      setBetHistories((prev) => [...prev, ...result]);
      currentPageRef.current += 1;
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    if (isAuthenticated && userId) {
      (async () => {
        const result = await fetchData(
          USER_API_ROUTES.BET.PAGINATED_HISTORY({ userId, page: 1 }),
          { signal: controller.signal }
        );

        if (result?.length) {
          setBetHistories(result);
          currentPageRef.current = 2;
        }
      })();
    }

    return () => controller.abort();
  }, [isAuthenticated, userId]);

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
      <div className="flex flex-col space-y-2 mb-3 h-full">
        {betHistories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-white/60">
            <img
              src={Avatar}
              alt="No history"
              className="w-16 h-16 object-contain opacity-50 mb-3"
            />
            <p className="text-sm">No bet history</p>
          </div>
        ) : (
          betHistories.map((bet, index) => {
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
                key={index}
                className={`grid grid-cols-4 gap-4 items-center text-xs px-2 rounded-lg py-1 font-semibold ${
                  isWin
                    ? "bg-green-500/10 text-green-500"
                    : "bg-white/5 text-white/90"
                }`}
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
          })
        )}
      </div>

      {/* Load More button */}
      {betHistories.length > 0 && (
        <SubmitButton
          className="self-center"
          isLoading={isLoading}
          onClick={handleFetchMore}
        >
          Load More
        </SubmitButton>
      )}
    </div>
  );
};

export default BetHistory;
