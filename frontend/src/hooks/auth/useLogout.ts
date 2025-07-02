import { USER_API_ROUTES } from "@/config/apiRoutes.config";
import { api } from "@/config/axios.config";
import { handleTryCatchError } from "@/utils/tryCatchError";
import { toast } from "react-toastify";
import useAuthStore from "@/stores/authStore";
import type { LogoutRes } from "@/types/shared/api/authTypes";

export const useLogout = () => {
  const deAuthenticate = useAuthStore((state) => state.deAuthenticate);

  const logout = async () => {
    try {
      const response = await api.post(USER_API_ROUTES.AUTH.LOGOUT);
      const logoutData: LogoutRes = response.data;

      deAuthenticate();
      toast.success(logoutData.message);
    } catch (err) {
      handleTryCatchError(err);
    }
  };

  return { logout };
};
