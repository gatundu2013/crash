import useAuthStore from "@/stores/authStore";
import NavNotAuthenticated from "./notAuthenticated/Index";
import NavAutheticated from "./authenticated/Index";

const NavRightSection = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return <>{isAuthenticated ? <NavAutheticated /> : <NavNotAuthenticated />}</>;
};

export default NavRightSection;
