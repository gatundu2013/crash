import HistoryImg from "../../assets/history.png";
import { format } from "date-fns";

const BetHistory = () => {
  const bets = [
    {
      betId: "8db29bc4-bbe6-41c2-8aea-a80147132885",
      roundId: "1e4d9555-5f3f-42ea-b58e-7bb408ba5479",
      stake: 10,
      payout: 12,
      cashoutMultiplier: 1.2,
      finalMultiplier: null,
      autoCashoutMultiplier: 1.2,
      createdAt: "2025-06-22T13:16:12.177Z",
    },
    {
      betId: "b1",
      roundId: "r1",
      stake: 10,
      payout: null,
      cashoutMultiplier: 1.2,
      finalMultiplier: null,
      autoCashoutMultiplier: 1.2,
      createdAt: "2025-06-22T13:16:12.177Z",
    },
  ];

  return (
    <div className="max-w-[550px] mx-auto relative flex flex-col space-y-1">
      {/* Header */}
      <div className="sticky top-[62px] z-10 bg-layer-1 pt-4 pb-2 space-y-2">
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
      <div className="flex flex-col space-y-2">
        {bets.map((bet) => {
          let date: string | null = null;
          let time: string | null = null;
          let dateObj: Date | null = null;

          if (bet.createdAt) {
            dateObj = new Date(bet.createdAt);
            date = format(dateObj, "dd/MM/yyyy");
            time = format(dateObj, "HH:mm:ss");
          }

          const stake = bet.stake?.toFixed(2) ?? "-";
          const multiplier =
            bet.cashoutMultiplier?.toFixed(2) ??
            bet.finalMultiplier?.toFixed(2) ??
            "-";
          const payout = bet.payout != null ? bet.payout.toFixed(2) : "-";
          const isWin = bet.payout;

          return (
            <div
              key={`${bet.betId}-${bet.roundId}`}
              className={`grid grid-cols-4 gap-4 items-center text-xs px-2 rounded-lg py-1 font-semibold ${
                isWin
                  ? "bg-green-500/10 text-green-500"
                  : "bg-white/5 text-white/90"
              }`}
            >
              <div className="flex flex-col leading-tight space-y-0.5 ">
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
    </div>
  );
};

export default BetHistory;
