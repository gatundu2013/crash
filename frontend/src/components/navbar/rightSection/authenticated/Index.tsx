import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Avatar1 from "../../../../assets/avatar.png";
import { Button } from "@/components/ui/button";
import { RiWallet3Line } from "react-icons/ri";
import useAuthStore from "@/stores/authStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MdAccountBalanceWallet,
  MdShield,
  MdHistory,
  MdStraighten,
  MdTrendingUp,
  MdLogout,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useLogout } from "@/hooks/auth/useLogout";

const NavAutheticated = () => {
  const userData = useAuthStore((state) => state.userData);
  const { logout } = useLogout();
  const navigate = useNavigate();

  const navItems = [
    {
      label: "Wallet",
      Icon: MdAccountBalanceWallet,
      handler: () => navigate("/wallet"),
    },
    { label: "Game Limits", Icon: MdTrendingUp },
    {
      label: "Bet History",
      Icon: MdHistory,
      handler: () => navigate("/bethistory"),
    },
    {
      label: "Game Rules",
      Icon: MdStraighten,
      handler: () => navigate("/gameRules"),
    },
    { label: "Provably Setting", Icon: MdShield },
    { label: "Logout", Icon: MdLogout, handler: () => logout() },
  ];

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

      <DropdownMenu>
        <DropdownMenuTrigger className="cursor-pointer">
          <Avatar className="border-2 border-green-1 h-10 w-10">
            <AvatarImage src={Avatar1} alt="User avatar" />
            <AvatarFallback className="bg-layer-4">AV</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-screen lg:min-w-64 py-3 border border-layer-5 mr-3 mt-2">
          {navItems.map((item) => (
            <DropdownMenuLabel
              onClick={() => item.handler?.()}
              key={item.label}
              className={`flex items-center text-white/75 text-[16px] font-medium
                  transition-all duration-300 rounded-md
                  text-sm cursor-pointer py-2 hover:bg-white/10 hover:text-white`}
            >
              <item.Icon className="mr-2 size-6" />
              {item.label}
            </DropdownMenuLabel>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default NavAutheticated;
