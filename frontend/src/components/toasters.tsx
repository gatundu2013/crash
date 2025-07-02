import { RiCheckFill } from "react-icons/ri";
import { toast } from "react-toastify";

interface cashoutSuccessParms {
  payout: number;
  cashoutMultiplier: number;
}

export const cashoutSuccessToaster = ({
  payout,
  cashoutMultiplier,
}: cashoutSuccessParms) => {
  toast(
    <div className="flex items-center  gap-7 font-medium w-full text-lg">
      <div>
        <p className="text-[14px] font-medium">Congratulations!</p>
        <h4 className="text-[17px] font-semibold  flex gap-1 items-baseline">
          <span className="">{payout && payout.toFixed(2)}</span>
          <span className="text-sm">KES</span>
        </h4>
      </div>
      <div>
        <p className="text-green-1 font-semibold text-[16px]">
          {cashoutMultiplier && cashoutMultiplier.toFixed(2)}x
        </p>
      </div>
    </div>,
    {
      icon: (
        <RiCheckFill className="bg-green-1 text-black rounded-full w-5 h-5" />
      ),
      className:
        "!bg-gradient-to-r !from-green-300/15 !to-layer-1 !flex !border !border-white/20 !rounded-sm !py-2",
    }
  );
};
