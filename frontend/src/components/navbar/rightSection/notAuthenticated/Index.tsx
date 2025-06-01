import { Button } from "@/components/ui/button";
import useChatStore from "@/stores/chatStore";
import { RiChat1Fill } from "react-icons/ri";
import { useNavigate } from "react-router-dom";

const NavNotAuthenticated = () => {
  const navigate = useNavigate();
  const toggleChats = useChatStore((state) => state.toggleChats);
  return (
    <div className="flex gap-3">
      <Button
        onClick={() => navigate("/signin")}
        variant={"outline"}
        className="font-bold"
      >
        Sign in
      </Button>
      <Button onClick={() => navigate("/signup")} className="font-bold">
        Sign Up
      </Button>
      <Button onClick={toggleChats} variant={"secondary"} size={"icon"}>
        <RiChat1Fill style={{ fontSize: "50px" }} />
      </Button>
    </div>
  );
};

export default NavNotAuthenticated;
