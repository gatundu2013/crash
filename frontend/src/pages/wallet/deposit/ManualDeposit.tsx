import { GAME_CONFIG } from "@/config/game.config";

const ManualDeposit = () => {
  return (
    <div className="p-4 rounded-xl bg-layer-2 border border-layer-3 text-white shadow-md space-y-6 max-w-lg mx-auto">
      <div className="text-left">
        <h2 className="text-xl font-bold  dark:text-white mb-2">
          📌 Manual Deposit Instructions
        </h2>
        <ul className="list-disc list-inside text-sm  text-white-90 space-y-1">
          <li>
            <span className="font-medium">Minimum deposit:</span>{" "}
            <strong className="text-green-1">
              KES {GAME_CONFIG.MIN_DEPOSIT}
            </strong>
          </li>
          <li>
            <span className="font-medium">Max deposit:</span>{" "}
            <strong className="text-green-1">
              KES {GAME_CONFIG.MAX_DEPOSIT}
            </strong>
          </li>
          <li>
            You can <span className="font-medium">ONLY</span> deposit using the
            same phone number you used to login.
          </li>
        </ul>
      </div>

      <div className="text-left">
        <h3 className="text-lg font-semibold  mb-2">
          💡 Steps to Deposit via M-PESA
        </h3>
        <ol className="list-decimal list-inside text-sm text-white/90 space-y-1">
          <li>
            Go to <strong>M-PESA</strong> on your phone
          </li>
          <li>
            Select <strong>Pay Bill</strong> option
          </li>
          <li>
            Enter Business Number:{" "}
            <strong className="text-green-600">547717</strong> (Apexx)
          </li>
          <li>
            Enter Account Number:{" "}
            <strong className="text-blue-600">WCRPOI</strong>
          </li>
          <li>
            Enter the <strong>amount</strong>
          </li>
          <li>
            Enter your <strong>M-PESA PIN</strong> and send
          </li>
        </ol>
      </div>
    </div>
  );
};

export default ManualDeposit;
