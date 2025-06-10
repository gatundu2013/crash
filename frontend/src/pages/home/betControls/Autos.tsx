import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RxCross1 } from "react-icons/rx";

const Autos = () => {
  return (
    <div className="flex justify-between items-center text-white/80 mt-1">
      {/* AutoBet */}
      <div className="flex gap-1.5 items-center">
        <h4 className="text-sm">AutoBet</h4>
        <Switch />
      </div>

      {/* Auto Cashout */}
      <div className="flex gap-1 items-center">
        <div className="flex items-center gap-1">
          <h4 className="text-sm">Auto Cashout</h4>
          <Switch />
        </div>
        <div className="flex items-center bg-layer-1 h-6 rounded-full px-1">
          <Input className="w-13 bg-inherit font-medium h-full text-center border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none text-white text-xs" />
          <button className="ml-0.5 text-white/60 hover:text-white transition-colors">
            <RxCross1 size={10} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Autos;
