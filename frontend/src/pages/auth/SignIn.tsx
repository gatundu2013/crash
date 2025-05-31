import { Form, FormField, SubmitButton } from "../../components/forms";
import { HiArrowNarrowLeft } from "react-icons/hi";
import { Button } from "../../components/ui/button";
import useSignIn from "@/hooks/auth/useSignIn";
import { Link, useNavigate } from "react-router-dom";

function SignIn() {
  const { form, signIn } = useSignIn();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;
  const navigate = useNavigate();

  return (
    <div className="w-full h-fit max-w-md mx-auto mt-5">
      <div className="flex items-center mb-6">
        <Button
          variant="secondary"
          className="p-0 text-white bg-transparent"
          onClick={() => navigate(-1)}
        >
          <HiArrowNarrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold w-full text-center">Sign In</h1>
      </div>

      <Form onSubmit={handleSubmit(signIn)} className="space-y-4">
        <FormField
          label="Phone Number"
          {...register("phoneNumber")}
          type="tel"
          placeholder="e.g 0796 549 576"
          error={errors.phoneNumber?.message}
          required
        />

        <FormField
          label="Password"
          {...register("password")}
          type="password"
          placeholder="Enter password"
          error={errors.password?.message}
          required
        />

        <div className="text-end text-sm">
          <a href="#" className="text-green-1 font-medium hover:underline">
            Forgot Password?
          </a>
        </div>

        <SubmitButton isLoading={isSubmitting}>Sign In</SubmitButton>
      </Form>

      <div className="mt-5 text-center space-x-1 text-sm">
        <span>Don't have an account?</span>
        <Link to="/signup" className="text-green-1 font-medium hover:underline">
          Sign Up
        </Link>
      </div>
    </div>
  );
}

export default SignIn;
