import React from "react";
import cc from "../assets/cc.svg";
import "./style.css";

const Header = () => {
  return (
    <div>
      <div className="text-center">
        <img src={cc} alt="Cloud&Cloud" className="cc" />
        <h6 className="text-center mt-5">
          This is a demo app for CI/CD and cloud deployment practices.
        </h6>
        <h1 className="text-center mt-5 header-text">Project Todos</h1>
      </div>
    </div>
  );
};

export default Header;
