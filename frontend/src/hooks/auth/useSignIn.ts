import { API_ROUTES } from "@/config/apiRoutes.config";
import { api } from "@/config/axios.config";
import useAuthStore from "@/stores/authStore";
import type { SignInFormData, SignUpFormData } from "@/types/auth.types";
import { handleTryCatchError } from "@/utils/tryCatchError";
import { signInSchema } from "@/validations/auth.validations";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "react-toastify";

const useSignIn = () => {
  const form = useForm<SignInFormData>({
    defaultValues: {
      phoneNumber: "",
      password: "",
    },
    resolver: yupResolver(signInSchema),
  });
  const authenticate = useAuthStore((state) => state.authenticate);

  const signIn: SubmitHandler<SignUpFormData> = async (
    data: SignUpFormData
  ) => {
    try {
      const response = await api.post(API_ROUTES.AUTH.SIGN_IN, data);
      const userData = response.data.user;

      authenticate(userData);
      toast.success("logged in successfully");
    } catch (error) {
      handleTryCatchError(error);
    }
  };

  return { form, signIn };
};

export default useSignIn;
