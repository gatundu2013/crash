import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Avatar1 from "../../../../assets/avatar.png";
import { Button } from "@/components/ui/button";
import { RiWallet3Line } from "react-icons/ri";
import useAuthStore from "@/stores/authStore";

const NavAutheticated = () => {
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

      <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
        <Avatar className="border-2 border-green-1 h-10 w-10">
          <AvatarImage src={Avatar1} alt="User avatar" />
          <AvatarFallback className="bg-layer-4">AV</AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
};

export default NavAutheticated;
