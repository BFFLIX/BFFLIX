import React from "react";
import bfflixLogo from "../assets/bfflix-logo.svg";
import defaultProfile from "../assets/default-profile.png";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import "../styles/HomePage.css"; // reuse the topbar styles

const getPageTitle = (pathname: string) => {
  switch (pathname) {
    case "/":
    case "/home":
      return "🏠 Home";
    case "/circles":
      return "👥 Circles";
    case "/viewings":
      return "🎬 Viewings";
    case "/ai":
      return "✨ AI Assistant";
    case "/profile":
      return "👤 Profile";
    default:
      return ""; // or return null to hide
  }
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="topbar-left">
          <img
            src={bfflixLogo}
            alt="BFFLIX"
            className="topbar-logo"
            onClick={() => navigate("/")}
          />
        </div>

        <div className="topbar-center">
          <h1>{pageTitle}</h1>
        </div>

        <div className="topbar-right">
          <button className="topbar-profile-btn">
            <img src={defaultProfile} alt="profile" />
          </button>
        </div>
      </header>

      {children}
    </div>
  );
};

export default AppLayout;