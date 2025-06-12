import { RiHistoryLine } from "react-icons/ri";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const values = [
  12.34, 1.45, 0.89, 2.56, 3.9, 1.45, 0.89, 2.11, 2.78, 1.12, 1.22, 3.44, 2.66,
  0.88, 4.0, 2.33, 1.55, 0.77, 2.99, 3.2, 1.41, 0.63, 1.84, 4.05, 1.16, 0.37,
  1.58, 0.79, 3.99, 1.21,
];

const PreviousMultipliers = () => {
  return (
    <div className="w-full bg-layer-3 px-2 py-1 rounded-lg mx-auto flex gap-2 items-center">
      <div className="w-full overflow-x-hidden flex-1">
        <div className="flex px-4 gap-4 min-w-max">
          {values.map((value, index) => (
            <div
              key={index}
              className={cn(
                "text-sm font-semibold px-2.5 cursor-pointer relative text-[#d7ed47]",
                value > 2 && "text-green-1"
              )}
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full inline-block mr-1 absolute -left-0.5 bg-[#d7ed47]",
                  value > 2 && "bg-green-1"
                )}
              ></span>
              <span>{value.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        className="bg-layer-5 flex-shrink-0"
      >
        <RiHistoryLine />
      </Button>
    </div>
  );
};

export default PreviousMultipliers;
