import { FiCpu, FiServer } from "react-icons/fi";
import ProvablyImg from "../../assets/provably.png";
import ChangeSeed from "./ChangeSeed";
import useAuthStore from "@/stores/authStore";
import useGameStore from "@/stores/gameStore";

const ProvablyFair = () => {
  const clientSeed = useAuthStore((state) => state.clientSeed);
  const hashedServerSeed = useGameStore((state) => state.hashedServerSeed);

  return (
    <div className="max-w-[650px] mx-auto text-white space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center space-y-0.5">
        <div className="w-11 h-11">
          <img
            src={ProvablyImg}
            alt="Provably Fair"
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-xl font-semibold text-center">
          Provably Fair Settings
        </h1>
        <p className="text-[15px] text-center text-white/85 mt-1">
          This game uses Provably Fair technology to ensure transparency. You
          can customize your client seed to verify that the game outcomes are
          fair and untampered. The result of each round is calculated using the
          server seed and the first 2 client seeds from each round.
        </p>
      </div>

      {/* Client Seed Section */}
      <div className="bg-layer-3 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <FiCpu className="text-lg size-7" />
          <h2 className="text-base font-medium">Your seed :</h2>
        </div>

        <p className="text-sm text-white/70">
          Round result is determined from a combination of the server seed and
          the first 2 client seeds of the round.
        </p>

        <div className="bg-layer-1 rounded-lg flex justify-between items-center px-4 py-2">
          <div className="text-sm flex gap-2">
            <span className="text-white/80">Current seed:</span>
            <span className="font-semibold">{clientSeed}</span>
          </div>
          <ChangeSeed />
        </div>
      </div>

      {/* Server Seed Section */}
      <div className="bg-white/5 rounded-xl p-4 space-y-2 shadow-md">
        <div className="flex items-center gap-2 mb-1">
          <FiServer className="text-lg" />
          <h2 className="text-base font-medium">Server seed SHA256:</h2>
        </div>
        <div className="bg-layer-1 px-3 py-2.5 rounded-xl flex items-center justify-between">
          <div className="flex justify-center items-center text-sm truncate">
            <h4>{hashedServerSeed}</h4>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProvablyFair;
