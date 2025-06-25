import { GAME_CONFIG } from "@/config/game.config";
import RulesImg from "../../assets/gameRules.png";
import { Link } from "react-router-dom";

const GameRules = () => {
  return (
    <div className="max-w-[600px] mx-auto  text-white space-y-4">
      {/* Header */}
      <div className="flex flex-col items-center">
        <div className="w-10 h-10">
          <img
            src={RulesImg}
            alt="rules"
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="text-2xl font-semibold text-center">Game Rules</h1>
      </div>

      {/* Section 1 - Objective */}
      <div className="bg-layer-3 rounded-xl p-4 space-y-2">
        <h2 className="text-xl font-semibold text-yellow-400">
          🚀 1. Game Objective
        </h2>
        <p>
          The goal of the game is to{" "}
          <strong>cash out before the multiplier crashes</strong>. The
          multiplier starts at <code>1.00x</code> and increases rapidly — but it
          can crash at any moment. The longer you wait, the higher your
          potential payout. However, if the crash happens before you cash out,
          you <strong>lose your stake</strong>.
        </p>
      </div>

      {/* Section 2 - Stake Limits */}
      <div className="bg-layer-3 rounded-xl p-4 space-y-2">
        <h2 className="text-xl font-semibold text-rose-400">
          💰 2. Stake Limits
        </h2>
        <p>Your bet must be between:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Minimum stake:</strong> {GAME_CONFIG?.MIN_STAKE}
          </li>
          <li>
            <strong>Maximum stake:</strong> {GAME_CONFIG?.MAX_STAKE}
          </li>
        </ul>
        <p>
          Any attempt to bet below or above these limits will be rejected by the
          system.
        </p>
      </div>

      {/* Section 3 - How the Game Works */}
      <div className="bg-layer-3 rounded-xl p-4 space-y-2">
        <h2 className="text-xl font-semibold text-sky-400">
          📈 3. How the Game Works
        </h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Each round starts at <strong>1.00x</strong>.
          </li>
          <li>The multiplier increases in real-time.</li>
          <li>
            The game ends when the multiplier <strong>crashes</strong> — which
            happens at a randomly determined point.
          </li>
          <li>You must cash out before the crash to win.</li>
        </ul>
      </div>

      {/* Section 4 - Cashing Out */}
      <div className="bg-layer-3 rounded-xl p-4 space-y-2">
        <h2 className="text-xl font-semibold text-emerald-400">
          💵 4. Cashing Out
        </h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Manual Cashout:</strong> Click “Cash Out” any time before
            the crash.
          </li>
          <li>
            <strong>Auto Cashout:</strong> If set, the system will automatically
            cash you out at your chosen multiplier — if the crash hasn’t
            happened yet.
          </li>
        </ul>
        <p>
          If you don’t cash out (manually or automatically) before the crash,
          you lose your stake.
        </p>
        <p className="mt-2">
          <strong>Payout = Stake × Multiplier at Cashout</strong>
        </p>
      </div>

      {/* Section 5 - Provably Fair System */}
      <div className="bg-layer-3 rounded-xl p-4 space-y-2">
        <h2 className="text-xl font-semibold text-violet-400">
          🔐 5. Provably Fair System
        </h2>
        <p>
          This game is built on a <strong>provably fair system</strong>. Every
          crash point is generated using cryptographic hashing before the round
          starts.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>The crash point is pre-determined and can't be changed.</li>
          <li>No one — not even the system — can influence the result.</li>
          <li>
            You can verify each result using the hash after the round ends.
          </li>
          <li>
            The crash point is calculated using a combination of the{" "}
            <strong>serverSeed</strong> and <strong>clientSeed</strong> from the
            first two users to place a bet in that round.
          </li>
        </ul>
        <p>This ensures full transparency and fairness for every player.</p>
      </div>

      {/* Section 6 - Key Rules & Clarifications */}
      <div className="bg-layer-3 rounded-xl p-4 space-y-2">
        <h2 className="text-xl font-semibold text-orange-400">
          📋 6. Key Rules & Clarifications
        </h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            ⚠️ Bets must be placed <strong>before</strong> the round begins. No
            bets are accepted once the multiplier starts.
          </li>
          <li>
            ⚠️ Auto cashout is not guaranteed if the crash occurs before or at
            your set multiplier.
          </li>
          <li>
            ⚠️ If you lose internet connection or refresh during a round and
            don’t have auto cashout set, your stake is at risk.
          </li>
          <li>
            ✅ You can verify the fairness of every round using the round hash.
          </li>
        </ul>
      </div>

      {/* Section 7 - Bet History */}
      <div className="bg-layer-3 rounded-xl p-4 space-y-2">
        <h2 className="text-xl font-semibold text-lime-400">
          🧾 7. Bet History
        </h2>
        <p>
          You can review your past rounds in your bet history. Each record
          includes:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Date & Time</li>
          <li>Stake amount</li>
          <li>Cashout Multiplier</li>
          <li>Payout (if any)</li>
          <li>Outcome (Win / Loss)</li>
        </ul>
      </div>

      {/* Section 8 - Responsible Gaming */}
      <div className="bg-layer-3 rounded-xl p-4 space-y-2">
        <h2 className="text-xl font-semibold text-red-500">
          🛑 8. Responsible Gaming
        </h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            This game is intended for players aged <strong>18 and above</strong>
            . Underage gambling is strictly prohibited.
          </li>

          <div className="flex justify-center">
            <Link to="#" className="text-center text-green-1 pt-3 text-sm">
              Term and Condition Apply
            </Link>
          </div>
        </ul>
      </div>
    </div>
  );
};

export default GameRules;
