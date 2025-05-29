import Logo from "../../../assets/logo.webp";

const NavLeftSection = () => {
  return (
    <div>
      <div className="w-[75px]">
        <img src={Logo} alt="logo" className="w-full h-full object-fill" />
      </div>
    </div>
  );
};

export default NavLeftSection;
