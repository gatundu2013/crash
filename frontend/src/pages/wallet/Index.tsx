import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WalletImg from "../../assets/wallet.png";
import Deposit from "./deposit/Index";
import Withdraw from "./withdraw/Index";
import useAuthStore from "@/stores/authStore";

const WALLET_TABS = {
  deposit: "Deposit",
  withdraw: "Withdraw",
};

const Wallet = () => {
  const [activeTab, setActiveTab] = useState(WALLET_TABS.deposit);
  const accountBalance = useAuthStore(
    (state) => state?.userData?.accountBalance
  );

  return (
    <div className="w-full h-full space-y-3 max-w-[500px] mx-auto rounded-md py-3">
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-full bg-green-200/20 flex items-center justify-center shadow-inner">
          <img
            src={WalletImg}
            alt="wallet"
            className="w-6 h-6 object-contain"
          />
        </div>
        <div className="text-center">
          <h4 className="text-xl font-semibold text-green-1">
            KES {accountBalance && accountBalance.toFixed(2)}
          </h4>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)}>
        <TabsList className="w-full h-8 self-center">
          <TabsTrigger value={WALLET_TABS.deposit}>Deposit</TabsTrigger>
          <TabsTrigger value={WALLET_TABS.withdraw}>Withdraw</TabsTrigger>
        </TabsList>

        <TabsContent value={WALLET_TABS.deposit} className="my-1">
          <Deposit />
        </TabsContent>
        <TabsContent value={WALLET_TABS.withdraw} className="my-3">
          <Withdraw />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Wallet;
