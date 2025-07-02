import { USER_API_ROUTES } from "@/config/apiRoutes.config";
import { api } from "@/config/axios.config";
import useAuthStore from "@/stores/authStore";
import type { AuthSuccessRes, LoginReq } from "@/types/shared/api/authTypes";
import { handleTryCatchError } from "@/utils/tryCatchError";
import { signInSchema } from "@/validations/auth.validations";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm, type SubmitHandler } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const useSignIn = () => {
  const form = useForm<LoginReq>({
    defaultValues: {
      phoneNumber: "",
      password: "",
    },
    resolver: yupResolver(signInSchema),
  });
  const authenticate = useAuthStore((state) => state.authenticate);
  const navigate = useNavigate();

  const signIn: SubmitHandler<LoginReq> = async (data: LoginReq) => {
    try {
      const response = await api.post(USER_API_ROUTES.AUTH.SIGN_IN, data);
      const userData: AuthSuccessRes = response.data;

      authenticate(userData.user);
      toast.success("logged in successfully");

      navigate("/");
    } catch (error) {
      handleTryCatchError(error);
    }
  };

  return { form, signIn };
};

export default useSignIn;
