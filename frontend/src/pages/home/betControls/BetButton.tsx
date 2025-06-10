import { Button } from "@/components/ui/button";
import type { BetStoreI } from "@/stores/betStore";

interface BetButtonProps extends Pick<BetStoreI, "stake"> {}

const BetButton = ({ stake }: BetButtonProps) => {
  return (
    <div className="w-full mt-0.5">
      <Button className="w-full h-10.5 text-md font-semibold">
        Bet {stake.toFixed(2)} KSH
      </Button>
    </div>
  );
};

export default BetButton;
