import { API_ROUTES } from "@/config/apiRoutes.config";
import { api } from "@/config/axios.config";
import useAuthStore from "@/stores/authStore";
import type { SignUpFormData } from "@/types/auth.types";
import { handleTryCatchError } from "@/utils/tryCatchError";
import { signUpSchema } from "@/validations/auth.validations";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "react-toastify";

const useSignUp = () => {
  const form = useForm<SignUpFormData>({
    defaultValues: {
      phoneNumber: "",
      username: "",
      password: "",
      agreeToTerms: false,
    },
    resolver: yupResolver(signUpSchema),
  });
  const authenticate = useAuthStore((state) => state.authenticate);

  const signUp: SubmitHandler<SignUpFormData> = async (
    data: SignUpFormData
  ) => {
    try {
      const response = await api.post(API_ROUTES.AUTH.SIGN_UP, data);
      const userData = response.data.user;

      authenticate(userData);
      toast.success("Account created");
    } catch (error) {
      handleTryCatchError(error);
    }
  };

  return { form, signUp };
};

export default useSignUp;
