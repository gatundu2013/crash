import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { FaServer } from "react-icons/fa";
import { BsFillLaptopFill } from "react-icons/bs";
import { IoShieldCheckmarkSharp } from "react-icons/io5";
import { AiOutlineLoading } from "react-icons/ai";
import { format } from "date-fns";
import useFetch from "@/hooks/useFetch";
import { GAME_API_ROUTES } from "@/config/apiRoutes.config";

interface PreviousMultiplierProps {
  finalMultiplier: number;
  roundId: string;
}

const PreviousMultiplier = ({
  finalMultiplier,
  roundId,
}: PreviousMultiplierProps) => {
  const { errMsg, isLoading, data, fetchData } = useFetch<any>();

  const getProvablyFairOutcome = async () => {
    await fetchData(
      GAME_API_ROUTES.PROVABLY_FAIR_RESULTS.GET_BY_ROUND_ID(roundId)
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          onClick={getProvablyFairOutcome}
          className={cn(
            "text-sm font-semibold px-2.5 cursor-pointer relative text-orange-1",
            finalMultiplier > 2 && "text-green-1"
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full inline-block mr-1 absolute -left-[0.5px] bg-orange-1",
              finalMultiplier > 2 && "bg-green-1"
            )}
          />
          <span className="animate-scale-up">{finalMultiplier.toFixed(2)}</span>
        </button>
      </DialogTrigger>

      <DialogContent className="bg-layer-3 border-none sm:max-w-2xl pb-12 transition-all duration-300">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-md font-medium">
            {data && (
              <>
                <p className="flex gap-1">
                  <span>ROUND</span>
                  <span className="text-pink-500">{data?.roundCount}</span>
                </p>
                <span className="text-orange-1 text-sm">
                  {data.createdAt && format(data.createdAt, "HH:mm:ss")}
                </span>
              </>
            )}
          </DialogTitle>
          <DialogDescription className="hidden" />
        </DialogHeader>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-10 space-y-2 text-sm text-white/80">
            <AiOutlineLoading className="animate-spin w-5 h-5 text-white" />
            <span>Loading, please wait...</span>
          </div>
        )}

        {/* Error State */}
        {errMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 max-w-md mx-auto rounded-lg px-6 py-5 flex flex-col items-center gap-2 shadow-sm">
            <p className="text-sm text-center text-red-300">{errMsg}</p>
          </div>
        )}

        {/* Content */}
        {!isLoading && !errMsg && (
          <>
            {/* Server Seed Section */}
            <div className="flex flex-col gap-1">
              <div className="flex gap-2 items-center">
                <FaServer size={30} className="text-white/70" />
                <div className="flex flex-col">
                  <p>Server Seed</p>
                  <p className="text-sm text-white/70 -mt-1">
                    Generated on the server
                  </p>
                </div>
              </div>
              <div className="bg-layer-1 rounded-lg py-1.5 px-3 text-sm break-all">
                {data?.provablyFairOutcome?.serverSeed}
              </div>
            </div>

            {/* Client Seed Section */}
            <div className="flex flex-col gap-1">
              <div className="flex gap-2 items-center">
                <BsFillLaptopFill size={30} className="text-white/70" />
                <div className="flex flex-col">
                  <p>Client seed</p>
                  <p className="text-sm text-white/70 -mt-1">
                    Generated on the players side
                  </p>
                </div>
              </div>

              {data?.provablyFairOutcome.clientSeedDetails.map(
                (clientSeed: any, index: any) => (
                  <div
                    key={index}
                    className="bg-layer-1 flex flex-col gap-1 md:flex-row justify-between items-center rounded-lg py-1.5 px-5 text-md"
                  >
                    <div className="flex gap-2 text-sm">
                      <h4 className="text-white/50">Player X1:</h4>
                      <p>{clientSeed?.username}</p>
                    </div>
                    <div className="flex gap-2 text-sm">
                      <h4 className="text-white/50">Seed:</h4>
                      <p>{clientSeed.seed}</p>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Results Section */}
            <div className="flex flex-col gap-1">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2 items-center">
                  <IoShieldCheckmarkSharp size={30} className="text-white/60" />
                  <div className="flex flex-col">
                    <p>Combined SHA256 Hash:</p>
                    <p className="text-sm text-white/70 -mt-1">
                      The above seeds are combined and converted to SHA256. This
                      is the game result.
                    </p>
                  </div>
                </div>
                <div className="bg-layer-1 rounded-lg py-1.5 px-3 text-sm break-all">
                  {data?.provablyFairOutcome?.gameHash}
                </div>
              </div>

              <div className="flex flex-col gap-2 md:flex-row rounded-lg py-2 px-3 text-white text-md">
                <div className="flex-1 flex flex-col gap-0.5">
                  <h4 className="text-center text-white/70">Hex:</h4>
                  <p className="bg-layer-1 text-center rounded-lg py-1.5 font-medium text-sm">
                    {data?.provablyFairOutcome?.gameHash?.substring(0, 13)}
                  </p>
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <h4 className="text-center text-white/70">Decimal:</h4>
                  <p className="bg-layer-1 text-center rounded-lg py-1.5 font-medium text-sm">
                    {data?.provablyFairOutcome?.decimal}
                  </p>
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <h4 className="text-center text-white/70">Result:</h4>
                  <p className="bg-layer-1 text-center rounded-lg py-1.5 font-medium text-sm">
                    {data?.provablyFairOutcome?.finalMultiplier?.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="flex justify-center text-sm bg-layer-2 rounded-b-lg absolute bottom-0 left-0 right-0 py-2">
              <h4 className="text-green-1 font-medium">
                Can be verified using any SHA256 online tool
              </h4>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PreviousMultiplier;
