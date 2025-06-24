import { Form, FormField, SubmitButton } from "@/components/forms";
import { GAME_CONFIG } from "@/config/game.config";

const Withdraw = () => {
  return (
    <div>
      <Form onSubmit={() => console.log("deposited")}>
        <FormField
          label={`${GAME_CONFIG.MIN_WITHDRAW} KES - ${GAME_CONFIG.MAX_WITHDRAW} KES`}
          required
          name="deposit"
          placeholder="Enter Withdrawal Amount"
        />
        <SubmitButton>Withdraw</SubmitButton>
      </Form>

      <div className="flex items-center justify-center gap-2 mt-3 text-sm">
        <p>Support:</p>
        <p className="text-orange-1 underline font-semibold">0796549576</p>
      </div>
    </div>
  );
};

export default Withdraw;
