import { FaLinkedin } from "react-icons/fa6";

const Footer = () => {
  const profiles = [
    {
      link: "https://www.linkedin.com/in/brian-gatundu-009589262/",
      Logo: FaLinkedin,
    },
  ];

  return (
    <div className="flex justify-between px-3 lg:px-8 py-4 bg-layer-3 mt-2 text-white/80">
      <h4 className="text-sm">
        © {new Date().getFullYear()} Apexx | All Rights Reserved
      </h4>
      <div className="flex gap-2">
        {profiles.map(({ link, Logo }, index) => {
          return (
            <a
              key={index}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {<Logo size={24} />}
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default Footer;
