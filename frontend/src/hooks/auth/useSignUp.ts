import { USER_API_ROUTES } from "@/config/apiRoutes.config";
import { api } from "@/config/axios.config";
import useAuthStore from "@/stores/authStore";
import type { AuthSuccessRes, RegisterReq } from "@/types/shared/api/authTypes";
import { handleTryCatchError } from "@/utils/tryCatchError";
import { signUpSchema } from "@/validations/auth.validations";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, type SubmitHandler } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const useSignUp = () => {
  const form = useForm<RegisterReq>({
    defaultValues: {
      phoneNumber: "",
      username: "",
      password: "",
      agreeToTerms: false,
    },
    resolver: yupResolver(signUpSchema),
  });
  const authenticate = useAuthStore((state) => state.authenticate);
  const navigate = useNavigate();

  const signUp: SubmitHandler<RegisterReq> = async (data: RegisterReq) => {
    try {
      const response = await api.post(USER_API_ROUTES.AUTH.SIGN_UP, data);
      const userData: AuthSuccessRes = response.data;

      authenticate(userData.user);
      toast.success("Account created");

      navigate("/");
    } catch (error) {
      handleTryCatchError(error);
    }
  };

  return { form, signUp };
};

export default useSignUp;
