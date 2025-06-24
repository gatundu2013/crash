import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InstantDeposit from "./InstantDeposit";
import ManualDeposit from "./ManualDeposit";
import { useState } from "react";

export const DEPOSIT_TRIGGERS = {
  instantDeposit: "instantDeposit",
  manualDeposit: "manualDeposit",
};

const Deposit = () => {
  const [activeTab, setActiveTab] = useState(DEPOSIT_TRIGGERS.instantDeposit);

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)}>
      <TabsList className="w-fit h-7 self-center">
        <TabsTrigger value={DEPOSIT_TRIGGERS.instantDeposit}>
          Instant Deposit
        </TabsTrigger>
        <TabsTrigger value={DEPOSIT_TRIGGERS.manualDeposit}>
          Manual Deposit
        </TabsTrigger>
      </TabsList>
      <TabsContent value={DEPOSIT_TRIGGERS.instantDeposit} className="my-3">
        <InstantDeposit setActiveTab={setActiveTab} />
      </TabsContent>
      <TabsContent value={DEPOSIT_TRIGGERS.manualDeposit} className="my-3">
        <ManualDeposit />
      </TabsContent>
    </Tabs>
  );
};

export default Deposit;
