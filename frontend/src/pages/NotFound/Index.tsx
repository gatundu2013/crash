import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import NotFoundSvg from "../../assets/notFound.svg";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen w-full  flex items-center justify-center -translate-y-[20%]">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="text-6xl font-bold mb-4">404</div>

        <div className="flex justify-center mb-6">
          <div className="w-16 h-16">
            <img
              src={NotFoundSvg}
              className="w-full h-full object-contain"
              alt="Page not found"
            />
          </div>
        </div>

        <p className=" text-white/80">Seems like you are lost.</p>

        <Button onClick={() => navigate("/", { replace: true })}>
          <Home className="w-4 h-4 mr-2" />
          Back Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
