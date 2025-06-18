import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LiveBets from "./liveBets/Index";

const RightSection = () => {
  return (
    <div className={"w-full h-[calc(100vh-75px)] lg:w-[550px] rounded-xl"}>
      <Tabs defaultValue="liveBets" className="h-full">
        <TabsList className="bg-layer-3 w-full flex rounded-lg text-white-2 ">
          <TabsTrigger value="liveBets">Live Bets</TabsTrigger>
          <TabsTrigger value="chats">Chats</TabsTrigger>
        </TabsList>
        <TabsContent
          value="liveBets"
          className="h-full flex flex-col bg-layer-4 rounded-xl py-2 px-2 relative "
        >
          <LiveBets />
        </TabsContent>
        <TabsContent value="chats" className="h-full bg-layer-4 rounded-3xl">
          Chats
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RightSection;
