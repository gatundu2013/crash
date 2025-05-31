import { Link } from "react-router-dom";
import Logo from "../../../assets/logo.webp";

const NavLeftSection = () => {
  return (
    <div>
      <Link to="/">
        <div className="w-[75px]">
          <img src={Logo} alt="logo" className="w-full h-full object-fill" />
        </div>
      </Link>
    </div>
  );
};

export default NavLeftSection;
