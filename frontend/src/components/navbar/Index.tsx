import NavLeftSection from "./leftSection/Index";
import NavRightSection from "./rightSection/Index";

const NavBar = () => {
  return (
    <div className="sticky top-0 left-0 right-0 z-20 bg-layer-3 h-[62px] flex items-center justify-between px-2.5 md:px-8">
      <NavLeftSection />
      <NavRightSection />
    </div>
  );
};

export default NavBar;
