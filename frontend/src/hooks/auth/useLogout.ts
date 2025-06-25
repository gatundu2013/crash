import { API_ROUTES } from "@/config/apiRoutes.config";
import { api } from "@/config/axios.config";
import { handleTryCatchError } from "@/utils/tryCatchError";
import { toast } from "react-toastify";
import useAuthStore from "@/stores/authStore";

export const useLogout = () => {
  const deAuthenticate = useAuthStore((state) => state.deAuthenticate);

  const logout = async () => {
    try {
      const response = await api.post(API_ROUTES.AUTH.LOGOUT);
      deAuthenticate();
      toast.success(response.data.message);
    } catch (err) {
      handleTryCatchError(err);
    }
  };

  return { logout };
};
