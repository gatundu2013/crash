import { Button } from "@/components/ui/button";
import { ROUTES } from "@/routes/Index";
import { useNavigate } from "react-router-dom";

const NavNotAuthenticated = () => {
  const navigate = useNavigate();

  return (
    <div className="flex gap-3">
      <Button
        onClick={() => navigate(ROUTES.SIGN_IN)}
        variant={"outline"}
        className="font-bold"
      >
        Sign in
      </Button>
      <Button onClick={() => navigate(ROUTES.SIGN_UP)} className="font-bold">
        Sign Up
      </Button>
    </div>
  );
};

export default NavNotAuthenticated;
