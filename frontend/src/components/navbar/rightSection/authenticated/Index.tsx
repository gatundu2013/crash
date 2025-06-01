import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Avatar1 from "../../../../assets/avatar.png";
import { Button } from "@/components/ui/button";
import { RiChat1Fill, RiWallet3Line, RiUserSettingsLine } from "react-icons/ri";
import useChatStore from "@/stores/chatStore";
import useAuthStore from "@/stores/authStore";

const NavAutheticated = () => {
  const toggleChats = useChatStore((state) => state.toggleChats);
  const userData = useAuthStore((state) => state.userData);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 bg-layer-4 px-2 py-1 rounded-md hover:bg-layer-5 transition-colors cursor-pointer">
        <RiWallet3Line className="text-green-1" />
        <div>
          <p className="text-xs text-white/70">Balance</p>
          <h4 className="text-[15px] font-semibold flex items-baseline">
            <span className="text-xs mr-1">KES</span>
            <span>{userData?.accountBalance.toFixed(2)}</span>
          </h4>
        </div>
      </div>

      <Button
        variant="default"
        size="sm"
        className="font-medium hidden md:block"
      >
        Deposit
      </Button>

      <div className="relative">
        <Button
          variant="secondary"
          size="sm"
          className="p-2"
          onClick={toggleChats}
        >
          <RiChat1Fill className="text-xl" />
        </Button>
      </div>

      <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
        <Avatar className="border-2 border-layer-5 h-9 w-9">
          <AvatarImage src={Avatar1} alt="User avatar" />
          <AvatarFallback className="bg-layer-4">AV</AvatarFallback>
        </Avatar>
        <RiUserSettingsLine className="text-white/70 hidden md:block" />
      </div>
    </div>
  );
};

export default NavAutheticated;
