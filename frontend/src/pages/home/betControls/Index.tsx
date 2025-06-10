import { betStores } from "@/stores/betStore";
import BetController from "./BetControllers";

const BetGrid = () => {
  return (
    <div className="flex justify-center mx-auto items-center space-x-3 w-full">
      {betStores.map(({ useStore, id }) => {
        return <BetController key={id} useStore={useStore} />;
      })}
    </div>
  );
};

export default BetGrid;
