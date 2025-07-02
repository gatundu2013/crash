import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LiveBets from "./liveBets/Index";

export const RIGHT_SECTION_TABS = {
  liveBets: "liveBets",
  chats: "chats",
};

const RightSection = () => {
  return (
    <div className={"w-full h-[calc(100vh-75px)] lg:w-[550px] rounded-xl"}>
      <Tabs defaultValue={RIGHT_SECTION_TABS.liveBets} className="h-full">
        <TabsList className="bg-layer-3 w-full flex rounded-lg text-white-2 ">
          <TabsTrigger
            key={RIGHT_SECTION_TABS.liveBets}
            value={RIGHT_SECTION_TABS.liveBets}
          >
            Live Bets
          </TabsTrigger>
          <TabsTrigger
            key={RIGHT_SECTION_TABS.chats}
            value={RIGHT_SECTION_TABS.chats}
          >
            Chats
          </TabsTrigger>
        </TabsList>
        <TabsContent
          key={RIGHT_SECTION_TABS.liveBets}
          value={RIGHT_SECTION_TABS.liveBets}
          className="h-full flex flex-col bg-layer-4 rounded-xl py-2 px-2 relative "
        >
          <LiveBets />
        </TabsContent>
        <TabsContent
          key={RIGHT_SECTION_TABS.chats}
          value={RIGHT_SECTION_TABS.chats}
          className="h-full bg-layer-4 rounded-3xl"
        >
          Chats
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RightSection;
