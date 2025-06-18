import { betStores } from "@/stores/betStore";
import BetController from "./BetControllers";

const BetGrid = () => {
  return (
    <div className="flex flex-col lg:flex-row justify-center mx-auto items-center gap-2 w-full">
      {betStores.map(({ useStore, id }) => {
        return <BetController key={id} useStore={useStore} />;
      })}
    </div>
  );
};

export default BetGrid;
