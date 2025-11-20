// client/src/pages/CircleInviteAcceptPage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiPost } from "../lib/api";
import TopBar from "../components/TopBar";
import LeftSidebar from "../components/LeftSidebar";

type StatusState = "pending" | "success" | "error";

const CircleInviteAcceptPage = () => {
  const { id, code } = useParams<{ id: string; code: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<StatusState>("pending");
  const [message, setMessage] = useState("Joining circle...");

  useEffect(() => {
    if (!id || !code) {
      setStatus("error");
      setMessage("Invite link is missing information.");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await apiPost(`/circles/${id}/join`, { inviteCode: code });
        if (cancelled) return;
        setStatus("success");
        setMessage("Success! Redirecting you to the circle...");
        setTimeout(() => navigate(`/circles/${id}`), 1200);
      } catch (err: any) {
        if (cancelled) return;
        setStatus("error");
        setMessage(err?.message || "Unable to join circle with this link.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, code, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-100 flex flex-col">
      <TopBar />
      <div className="flex flex-1">
        <LeftSidebar />
        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950/80 p-8 text-center shadow-2xl">
            <div className="text-5xl mb-4">
              {status === "success" ? "✔" : status === "error" ? "!" : "..."}
            </div>
            <h1 className="text-2xl font-semibold mb-2">Circle invitation</h1>
            <p className="text-slate-300 mb-6">{message}</p>

            <div className="flex flex-col gap-3">
              {status !== "pending" && id && (
                <button
                  type="button"
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold shadow hover:brightness-110"
                  onClick={() => navigate(`/circles/${id}`)}
                >
                  Go to circle
                </button>
              )}
              <button
                type="button"
                className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10"
                onClick={() => navigate("/circles")}
              >
                Back to circles
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CircleInviteAcceptPage;
