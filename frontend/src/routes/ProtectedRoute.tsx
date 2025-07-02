import { Navigate, Outlet } from "react-router-dom";
import { ROUTES } from "@/routes/Index";
import useAuthStore from "@/stores/authStore";

const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return isAuthenticated ? <Outlet /> : <Navigate to={ROUTES.HOME} replace />;
};

export default ProtectedRoute;
