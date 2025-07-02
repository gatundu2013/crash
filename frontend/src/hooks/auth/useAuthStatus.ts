import { USER_API_ROUTES } from "@/config/apiRoutes.config";
import { api } from "@/config/axios.config";
import useAuthStore from "@/stores/authStore";
import type { AuthSuccessRes } from "@/types/shared/api/authTypes";
import { useEffect } from "react";

const useAuthStatus = () => {
  const authenticate = useAuthStore((state) => state.authenticate);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await api.get(USER_API_ROUTES.AUTH.STATUS);
        const userData: AuthSuccessRes = response.data;
        authenticate(userData.user);
      } catch (err) {
        console.error("Auth check failed:", err);
      }
    };

    checkAuthStatus();
  }, []);
};

export default useAuthStatus;
