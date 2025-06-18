import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const NavNotAuthenticated = () => {
  const navigate = useNavigate();

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
    </div>
  );
};

export default NavNotAuthenticated;
