// src/components/TopBar.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../lib/api";
import bfflixLogo from "../assets/bfflix-logo.svg";

interface TopBarProps {
  currentUserName?: string | null;
  currentUserAvatarUrl?: string | null;
}

const TopBar = ({
  currentUserName,
  currentUserAvatarUrl,
}: TopBarProps) => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string | null>(
    currentUserName ?? null
  );
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(
    currentUserAvatarUrl ?? null
  );

  // Fallback: try to read the user name from localStorage if the prop is not provided
  useEffect(() => {
    if (typeof currentUserName !== "undefined") {
      setUserName(currentUserName ?? null);
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

  useEffect(() => {
    if (typeof currentUserAvatarUrl !== "undefined") {
      setUserAvatarUrl(currentUserAvatarUrl ?? null);
    }
  }, [currentUserAvatarUrl]);

  useEffect(() => {
    if (currentUserName && currentUserAvatarUrl) return;

    let isMounted = true;

    (async () => {
      try {
        const me = await apiGet<any>("/me");
        if (!isMounted) return;
        if (!currentUserName && typeof me?.name === "string") {
          setUserName(me.name);
        }
        if (!currentUserAvatarUrl && typeof me?.avatarUrl === "string") {
          const cleanedAvatar = me.avatarUrl.trim();
          setUserAvatarUrl(cleanedAvatar ? cleanedAvatar : null);
        }
      } catch {
        // Ignore failures; we'll fall back to initials
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [currentUserName, currentUserAvatarUrl]);

  const profileInitial =
    userName && userName.trim().length > 0
      ? userName.trim().charAt(0).toUpperCase()
      : "?";

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
        {userAvatarUrl ? (
          <img
            src={userAvatarUrl}
            alt={`${userName || "Profile"} avatar`}
            className="h-8 w-8 rounded-full object-cover border border-white/20"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-red-500 text-sm font-semibold text-white">
            {profileInitial}
          </span>
        )}
      </button>
    </div>
  );
};

export default TopBar;
