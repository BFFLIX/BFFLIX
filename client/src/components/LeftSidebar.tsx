// src/components/LeftSidebar.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";

const LeftSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <aside className="w-56 flex-shrink-0 bg-black/40 border-r border-white/5 flex flex-col gap-4 py-6 sticky top-0 h-screen">
      <nav className="flex flex-col gap-2 px-4">
        <button
          className={`flex items-center gap-3 px-4 py-2 rounded-xl font-semibold shadow-[0_12px_30px_rgba(0,0,0,0.7)] ${
            currentPath === "/" ? "bg-gradient-to-r from-pink-600 to-red-500 text-white" : "hover:bg-white/5 text-slate-200"
          }`}
          type="button"
          onClick={() => navigate("/home")}>
          <span>🏠</span>
          <span>Home</span>
        </button>

        <button
          className={`flex items-center gap-3 px-4 py-2 rounded-xl ${
            currentPath.startsWith("/circles")
              ? "bg-gradient-to-r from-pink-600 to-red-500 text-white font-semibold shadow-[0_12px_30px_rgba(0,0,0,0.7)]"
              : "hover:bg-white/5 text-slate-200"
          }`}
          type="button"
          onClick={() => navigate("/circles")}
        >
          <span>👥</span>
          <span>Circles</span>
        </button>

        <button
          className={`flex items-center gap-3 px-4 py-2 rounded-xl ${
            currentPath.startsWith("/viewings")
              ? "bg-gradient-to-r from-pink-600 to-red-500 text-white font-semibold shadow-[0_12px_30px_rgba(0,0,0,0.7)]"
              : "hover:bg-white/5 text-slate-200"
          }`}
          type="button"
          onClick={() => navigate("/viewings")}
        >
          <span>🎬</span>
          <span>Viewings</span>
        </button>

        <button
          className={`flex items-center gap-3 px-4 py-2 rounded-xl ${
            currentPath.startsWith("/ai")
              ? "bg-gradient-to-r from-pink-600 to-red-500 text-white font-semibold shadow-[0_12px_30px_rgba(0,0,0,0.7)]"
              : "hover:bg-white/5 text-slate-200"
          }`} 
          type="button"
          onClick={() => navigate("/ai")}
        >
          <span>✨</span>
          <span>AI Assistant</span>
        </button>
      </nav>

      <div className="mt-[120px] px-4">
        <button
          className="w-full py-2 rounded-xl bg-red-600/90 text-white font-semibold hover:bg-red-500 shadow-[0_10px_25px_rgba(0,0,0,0.8)]"
          type="button"
          onClick={handleLogout}
        >
          Log Out
        </button>
      </div>
    </aside>
  );
};

export default LeftSidebar;