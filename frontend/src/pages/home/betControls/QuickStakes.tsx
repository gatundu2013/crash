import { Button } from "@/components/ui/button";

const QuickStakes = () => {
  const defaultStakes = [10, 50, 100, 1000];
  return (
    <div className="grid grid-cols-4 gap-1">
      {defaultStakes.map((value, index) => (
        <Button
          key={index}
          className="h-5 flex-1 px-3 bg-layer-2 border border-white/10 text-white/80 py-3 rounded-full hover:bg-layer-3 transition-colors"
        >
          {value.toFixed(2)}
        </Button>
      ))}
    </div>
  );
};

export default QuickStakes;
