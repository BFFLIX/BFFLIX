// client/src/pages/CircleInvitationsPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../lib/api";
import TopBar from "../components/TopBar";
import LeftSidebar from "../components/LeftSidebar";

type PopulatedCircle = {
  _id?: string;
  id?: string;
  name?: string;
  description?: string;
  visibility?: "private" | "public";
};

type Invitation = {
  _id: string;
  circleId: PopulatedCircle | string;
  invitedBy?: { _id?: string; name?: string; email?: string };
  createdAt?: string;
  expiresAt?: string;
};

const extractCircleMeta = (invitation: Invitation) => {
  const circle = invitation.circleId as PopulatedCircle | string | undefined;

  if (!circle) {
    return {
      id: "",
      name: "Unknown circle",
      description: "",
      visibility: "private" as const,
    };
  }

  if (typeof circle === "string") {
    return {
      id: circle,
      name: "Unknown circle",
      description: "",
      visibility: "private" as const,
    };
  }

  return {
    id: String(circle._id || circle.id || ""),
    name: circle.name || "Untitled circle",
    description: circle.description || "",
    visibility: circle.visibility === "public" ? "public" : "private",
  };
};

const CircleInvitationsPage = () => {
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<any>("/circles/invitations/me?page=1&limit=50");
      let items: Invitation[] = [];
      if (Array.isArray(data?.items)) {
        items = data.items;
      } else if (Array.isArray(data)) {
        items = data;
      }
      setInvitations(items);
    } catch (err: any) {
      setError(err?.message || "Unable to load invitations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const hasInvitations = useMemo(
    () => invitations.length > 0,
    [invitations]
  );

  const handleRespond = async (circleId: string, action: "accept" | "decline") => {
    if (!circleId) return;
    try {
      setBusyId(`${circleId}:${action}`);
      setActionError(null);
      await apiPost(`/circles/${circleId}/invite/${action}`, {});
      await fetchInvitations();
    } catch (err: any) {
      setActionError(err?.message || `Unable to ${action} invitation.`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100 flex flex-col">
      <TopBar />
      <div className="flex flex-1">
        <LeftSidebar />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-10 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-6">
            <button
              type="button"
              onClick={() => navigate("/circles")}
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
            >
              <span className="text-lg">←</span>
              <span>Back to circles</span>
            </button>

            <header className="bg-slate-900/60 border border-white/5 rounded-3xl px-6 py-5 shadow-[0_25px_60px_rgba(0,0,0,0.8)]">
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Circle invitations
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Review your pending circle invitations. Accept to join instantly, or decline to dismiss.
              </p>
            </header>

            {error && (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            )}

            {actionError && (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-500/5 px-4 py-3 text-sm text-rose-200">
                {actionError}
              </div>
            )}

            {loading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-slate-300 text-sm">
                Loading invitations...
              </div>
            ) : hasInvitations ? (
              <div className="space-y-4">
                {invitations.map((invitation) => {
                  const circle = extractCircleMeta(invitation);
                  const inviterName = invitation.invitedBy?.name || "A circle member";
                  const createdLabel = invitation.createdAt
                    ? new Date(invitation.createdAt).toLocaleString()
                    : null;
                  const expiresLabel = invitation.expiresAt
                    ? new Date(invitation.expiresAt).toLocaleDateString()
                    : null;
                  const busyAccept = busyId === `${circle.id}:accept`;
                  const busyDecline = busyId === `${circle.id}:decline`;

                  return (
                    <div
                      key={invitation._id}
                      className="rounded-3xl border border-white/5 bg-gradient-to-br from-slate-950/80 to-slate-900/70 px-5 py-5 shadow-[0_18px_55px_rgba(0,0,0,0.85)]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold text-white">
                              {circle.name}
                            </h2>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border ${
                                circle.visibility === "public"
                                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                  : "bg-slate-700/40 text-slate-200 border-slate-600/40"
                              }`}
                            >
                              {circle.visibility === "public" ? "Public" : "Private"}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400 mt-1">
                            Invited by <span className="text-slate-200">{inviterName}</span>
                            {createdLabel && ` • Sent ${createdLabel}`}
                          </p>
                          {circle.description && (
                            <p className="mt-2 text-sm text-slate-300">{circle.description}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 text-xs text-slate-400">
                          {expiresLabel && <span>Expires {expiresLabel}</span>}
                          <button
                            type="button"
                            className="text-sm text-pink-300 hover:text-pink-200"
                            onClick={() => circle.id && navigate(`/circles/${circle.id}`)}
                            disabled={!circle.id}
                          >
                            View circle
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          className="px-4 py-2 rounded-full bg-gradient-to-r from-pink-600 to-red-500 text-white text-sm font-semibold shadow hover:brightness-110 disabled:opacity-60"
                          onClick={() => handleRespond(circle.id, "accept")}
                          disabled={!circle.id || busyAccept}
                        >
                          {busyAccept ? "Accepting..." : "Accept invitation"}
                        </button>
                        <button
                          type="button"
                          className="px-4 py-2 rounded-full border border-white/15 text-sm font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-60"
                          onClick={() => handleRespond(circle.id, "decline")}
                          disabled={!circle.id || busyDecline}
                        >
                          {busyDecline ? "Declining..." : "Decline"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-6 text-center text-sm text-slate-300">
                You don't have any pending invitations right now.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CircleInvitationsPage;
