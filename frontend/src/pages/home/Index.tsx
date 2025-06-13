import PreviousMultipliers from "./previousMutipliers/Index";
import CanvasComponent from "./canvas/Index";
import useChatStore from "@/stores/chatStore";
import BetGrid from "./betControls/Index";
import { cn } from "@/lib/utils";
import { Tabs, TabsTrigger } from "@/components/ui/tabs";
import { TabsContent, TabsList } from "@radix-ui/react-tabs";
import useGameStore from "@/stores/gameStore";

const Home = () => {
  const chatsAreShown = useChatStore((state) => state.chatsAreShown);
  const gamePhase = useGameStore((state) => state.gamePhase);

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row w-full h-full gap-1.5",
        chatsAreShown && "md:flex-col"
      )}
    >
      <div className="w-full flex flex-col bg-layer-2 rounded-xl py-1 md:py-2 md:px-5 min-w-0 h-[calc(100vh-75px)]">
        <PreviousMultipliers />
        <CanvasComponent />
        <BetGrid />
      </div>

      <div
        className={cn(
          "w-full h-[calc(100vh-75px)] lg:w-[550px]  rounded-xl",
          chatsAreShown && "lg:w-full"
        )}
      >
        <Tabs defaultValue="liveBets" className="h-full">
          <TabsList className="bg-layer-3 flex rounded-lg text-white-2 ">
            <TabsTrigger value="liveBets">Live Bets</TabsTrigger>
            <TabsTrigger value="tops">Tops</TabsTrigger>
          </TabsList>
          <TabsContent
            value="liveBets"
            className="h-full flex flex-col bg-layer-4 rounded-xl py-2 px-3 relative "
          >
            <div className="sticky top-0 space-y-1 ">
              <div className="bg-layer-2 rounded-md py-2 px-3 flex justify-between text-sm font-medium">
                <div className="flex items-center gap-2">
                  <div className="bg-green-500/25 w-3.5 h-3.5 rounded-full relative flex items-center justify-center">
                    <div className="animate-pulse absolute duration-1000 bg-green-1 h-1 w-1 rounded-full"></div>
                  </div>

                  <h4 className="flex gap-1">
                    <span>456/2000</span>
                    <span>Players</span>
                  </h4>
                </div>
                <h4>Ksh 800000.00</h4>
              </div>

              <div className="grid grid-cols-4 text-md text-white/60 font-medium text-[14px]">
                <h4 className="">Player</h4>
                <h4 className="">Stake</h4>
                <h4 className=""> x</h4>
                <h4 className="flex gap-1 items-baseline ">
                  <span>Payout</span>
                  <span className="text-sm">KES</span>
                </h4>
              </div>
            </div>

            <div className="mt-2 flex-1 overflow-y-scroll mb-3 gap-1">
              <div className="flex flex-col space-y-4.5 pt-1">
                <div className="grid grid-cols-4 text-md text-[15px] font-medium">
                  <h4 className="whitespace-break">Jamess</h4>
                  <h4 className="">10000.00</h4>
                  <h4 className="">-</h4>
                  <h4 className="">-</h4>
                </div>
                <div className="grid grid-cols-4 text-[15px] font-medium">
                  <h4 className="">Timothy</h4>
                  <h4 className="">10000.00</h4>
                  <h4 className="text-green-1">12.23x</h4>
                  <h4 className="text-green-1">200000</h4>
                </div>
                <div>{gamePhase}</div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="tops" className="h-full bg-layer-4 rounded-3xl">
            tops
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Home;
