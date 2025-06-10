import BetController from "./BetControllers";

const BetGrid = () => {
  return (
    <div className="flex justify-center mx-auto items-center space-x-3 w-full">
      <BetController />
      <BetController />
    </div>
  );
};

export default BetGrid;
