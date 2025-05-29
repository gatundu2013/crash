import { Button } from "@/components/ui/button";
import React from "react";
import { RiChat1Fill } from "react-icons/ri";

const NavNotAuthenticated = () => {
  return (
    <div className="flex gap-4">
      <Button variant={"outline"} className="font-bold">
        Sign in
      </Button>
      <Button className="font-bold">Sign Up</Button>
      <Button variant={"secondary"} size={"icon"}>
        <RiChat1Fill style={{ fontSize: "50px" }} />
      </Button>
    </div>
  );
};

export default NavNotAuthenticated;
