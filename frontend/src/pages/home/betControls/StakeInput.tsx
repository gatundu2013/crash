import { Input } from "@/components/ui/input";
import { RxMinus, RxPlus } from "react-icons/rx";

const StakeInput = () => {
  return (
    <div className="bg-layer-2 flex items-center rounded-2xl px-1 h-8 py-0.5 font-medium">
      <button className="bg-layer-5 font-bold flex items-center justify-center cursor-pointer w-6.5 h-6.5 p-1.5 rounded-xl text-white-2 transition-all hover:text-white active:scale-95">
        <RxMinus />
      </button>
      <Input
        className="h-full text-center bg-inherit border-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none font-semibold tracking-wide"
        value={"10.00"}
      />
      <button className="bg-layer-5 flex items-center justify-center cursor-pointer w-6.5 h-6.5 p-1.5 rounded-xl text-white-2 transition-all hover:text-white active:scale-95">
        <RxPlus />
      </button>
    </div>
  );
};

export default StakeInput;
