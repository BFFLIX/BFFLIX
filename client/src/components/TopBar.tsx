// src/components/TopBar.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import bfflixLogo from "../assets/bfflix-logo.svg";

interface TopBarProps {
  currentUserName?: string | null;
  showName?: boolean;
}

const TopBar = ({ currentUserName, showName = false }: TopBarProps) => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string | null>(
    currentUserName ?? null
  );

  // Fallback: try to read the user name from localStorage if the prop is not provided
  useEffect(() => {
    if (currentUserName) {
      setUserName(currentUserName);
      return;
    }

    try {
      const raw = window.localStorage.getItem("bfflix_user");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.name === "string") {
          setUserName(parsed.name);
        }
      }
    } catch {
      // Ignore parse errors and just leave "Profile" as the label
    }
  }, [currentUserName]);

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/40 backdrop-blur">
      {/* Left side: clickable logo that sends you home */}
      <button
        type="button"
        className="flex items-center gap-3"
        onClick={() => navigate("/home")}
      >
        <img
          src={bfflixLogo}
          alt="BFFlix"
          className="h-10 w-auto drop-shadow-[0_0_18px_rgba(255,0,122,0.6)]"
        />
      </button>

      {/* Right side: profile pill */}
      <button
        type="button"
        className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition"
        onClick={() => navigate("/profile")}
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-red-500 text-sm">
          👤
        </span>
        {showName && (
          <span className="font-medium text-sm">
            {userName || "Profile"}
          </span>
        )}
      </button>
    </div>
  );
};

export default TopBar;