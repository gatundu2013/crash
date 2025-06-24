import { Form, FormField, SubmitButton } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { GAME_CONFIG } from "@/config/game.config";
import { DEPOSIT_TRIGGERS } from "./Index";

interface InstantDepositProps {
  setActiveTab: (value: string) => void;
}

const InstantDeposit = ({ setActiveTab }: InstantDepositProps) => {
  return (
    <div>
      <Form onSubmit={() => console.log("deposited")}>
        <FormField
          label={`${GAME_CONFIG.MIN_DEPOSIT} KES - ${GAME_CONFIG.MAX_DEPOSIT} KES`}
          required
          name="deposit"
          placeholder="Enter Deposit Amount"
        />
        <SubmitButton>Deposit</SubmitButton>
      </Form>

      <div className="flex items-center gap-2 mt-3 text-sm">
        <p>Having Difficulties?</p>
        <Button
          onClick={() => setActiveTab(DEPOSIT_TRIGGERS.manualDeposit)}
          variant="ghost"
          className="text-green-1 p-0 hover:bg-transparent hover:text-green-1 "
        >
          Try manual Deposit
        </Button>
      </div>
    </div>
  );
};

export default InstantDeposit;
