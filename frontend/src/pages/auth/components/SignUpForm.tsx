import { Form, FormField, SubmitButton } from "../../../components/forms";
import { HiArrowNarrowLeft } from "react-icons/hi";
import { Button } from "../../../components/ui/button";
import useSignUp from "@/hooks/auth/useSignUp";
import { Checkbox } from "@/components/ui/checkbox";

export function SignUpForm() {
  const { form, signUp } = useSignUp();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
    setValue,
  } = form;

  const handleCheckboxChange = (checked: boolean) => {
    setValue("agreeToTerms", checked, { shouldValidate: true });
  };

  return (
    <div className="w-full h-fit max-w-md mx-auto mt-5">
      <div className="flex items-center mb-6">
        <Button
          variant="secondary"
          className="p-0 text-white bg-transparent"
          onClick={() => console.log("Go back")}
        >
          <HiArrowNarrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold w-full text-center">Sign Up</h1>
      </div>

      <Form onSubmit={handleSubmit(signUp)} className="space-y-4">
        <FormField
          label="Phone Number"
          {...register("phoneNumber")}
          type="tel"
          placeholder="e.g 0796 549 576"
          error={errors.phoneNumber?.message}
          required
        />

        <FormField
          label="Username"
          {...register("username")}
          placeholder="Choose a username"
          error={errors.username?.message}
          required
        />

        <FormField
          label="Password"
          {...register("password")}
          type="password"
          placeholder="Create a password"
          error={errors.password?.message}
          required
        />

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={getValues().agreeToTerms}
              onCheckedChange={handleCheckboxChange}
            />
            <label className="text-sm leading-tight cursor-pointer">
              <span className="leading-tight text-sm">
                I agree to the{" "}
                <a href="#" className="text-green-1 hover:underline">
                  Terms and Conditions
                </a>{" "}
                & confirm I am at least 18 years old
              </span>
            </label>
          </div>
          {errors.agreeToTerms?.message && (
            <p className="text-red-500 text-sm ml-6">
              {errors.agreeToTerms.message}
            </p>
          )}
        </div>

        <SubmitButton isLoading={isSubmitting} className="mt-3">
          Sign Up
        </SubmitButton>
      </Form>

      <div className="mt-5 text-center space-x-1 text-sm">
        <span>Already have an account?</span>
        <a href="#" className="text-green-1 font-medium hover:underline">
          Sign In
        </a>
      </div>
    </div>
  );
}
