
//client/src/pages/CirclePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../lib/api";
import LeftSidebar from "../components/LeftSidebar";
import TopBar from "../components/TopBar";

type CircleVisibility = "private" | "public";

// Circle shape is a bit flexible because the backend can return
// either a bare circle document or a wrapper like { circle: {...} }.
// We keep everything as-is from the backend and use helpers to
// read id, name, visibility, etc.
type Circle = {
  id?: string;
  _id?: string;
  circleId?: string;
  name?: string;
  description?: string;
  visibility?: CircleVisibility;
  members?: any[];
  membersCount?: number;
  memberCount?: number;
  postsCount?: number;
  postCount?: number;
  isMember?: boolean;
  createdAt?: string;
  circle?: Circle; // nested circle in membership payloads
  [key: string]: any;
};

type TabKey = "my" | "discover";

const CirclesPage: React.FC = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>("my");
  const [search, setSearch] = useState("");
  const [myCircles, setMyCircles] = useState<Circle[]>([]);
  const [discoverCircles, setDiscoverCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joiningCircleId, setJoiningCircleId] = useState<string | null>(null);
  const [leavingCircleId, setLeavingCircleId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newVisibility, setNewVisibility] = useState<"private" | "public">(
    "private"
  );
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // -------- helper functions to read backend shapes --------

  const getBase = (c: Circle): Circle => {
    // If the API returns { circle: { ...actual circle... }, ...membershipFields }
    return (c.circle as Circle) || c;
  };

  const getCircleId = (c: Circle): string | null => {
    // Prefer direct id from backend
    if (c.id) return String(c.id);
    if (c._id) return String(c._id);
    if (c.circleId) return String(c.circleId);

    // If nested shape ever appears, handle it too
    if (c.circle) {
      const inner = c.circle as any;
      if (inner.id) return String(inner.id);
      if (inner._id) return String(inner._id);
      if (inner.circleId) return String(inner.circleId);
    }

    return null;
  };

  const getName = (c: Circle): string => {
    const base = getBase(c);
    return base.name || "Untitled circle";
  };

  const getDescription = (c: Circle): string => {
    const base = getBase(c);
    return base.description || "";
  };

  const getVisibility = (c: Circle): CircleVisibility => {
    const base = getBase(c);
    const v = (base.visibility || "public").toLowerCase();
    return v === "private" ? "private" : "public";
  };

  const computeMembersCount = (c: Circle): number => {
    const base = getBase(c);
    if (typeof base.membersCount === "number") return base.membersCount;
    if (typeof base.memberCount === "number") return base.memberCount;
    if (Array.isArray(base.members)) return base.members.length;
    return 0;
  };

  const computePostsCount = (c: Circle): number => {
    const base = getBase(c);
    if (typeof base.postsCount === "number") return base.postsCount;
    if (typeof base.postCount === "number") return base.postCount;
    return 0;
  };

  const isMember = (c: Circle): boolean => {
    if (typeof c.isMember === "boolean") return c.isMember;
    const id = getCircleId(c);
    if (!id) return false;
    return myCircles.some((mc) => getCircleId(mc) === id);
  };

  // circles for current tab + search filter
  const circlesForTab = useMemo(() => {
    const list = activeTab === "my" ? myCircles : discoverCircles;
    if (!search.trim()) return list;

    const q = search.trim().toLowerCase();
    return list.filter((c) => {
      const name = getName(c).toLowerCase();
      const desc = getDescription(c).toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [activeTab, myCircles, discoverCircles, search]);

  // -------- data loading --------

  const loadCircles = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the backend responses directly; do not reshape them so we
      // never accidentally filter circles out because of id mismatches.
      const [myJson, discoverJson] = await Promise.all([
        apiGet<Circle[] | { items: Circle[] } | { data: Circle[] }>("/circles"),
        apiGet<Circle[] | { items: Circle[] } | { data: Circle[] }>(
          "/circles/discover/list"
        ),
      ]);

      const toArray = (payload: any): Circle[] => {
        if (Array.isArray(payload)) return payload as Circle[];
        if (Array.isArray(payload?.items)) return payload.items as Circle[];
        if (Array.isArray(payload?.data)) return payload.data as Circle[];
        return [];
      };

      setMyCircles(toArray(myJson));
      setDiscoverCircles(toArray(discoverJson));
    } catch (err: any) {
      console.error("Error loading circles", err);
      setError(err?.message || "Something went wrong loading circles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCircles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------- actions --------

  const handleCreateCircleClick = () => {
    setShowCreateModal((prev) => !prev);
    setCreateError(null);
  };

  const handleJoin = async (circle: Circle) => {
    const circleId = getCircleId(circle);
    if (!circleId) {
      setError("Circle id is missing. Please refresh and try again.");
      return;
    }

    try {
      setJoiningCircleId(circleId);
      setError(null);

      await apiPost(`/circles/${circleId}/join`, {});

      await loadCircles();
    } catch (err: any) {
      console.error("Error joining circle", err);
      setError(err?.message || "Could not join circle.");
    } finally {
      setJoiningCircleId(null);
    }
  };

  const handleLeave = async (circle: Circle) => {
    const circleId = getCircleId(circle);
    if (!circleId) {
      setError("Circle id is missing. Please refresh and try again.");
      return;
    }

    try {
      setLeavingCircleId(circleId);
      setError(null);

      await apiPost(`/circles/${circleId}/leave`, {});

      await loadCircles();
    } catch (err: any) {
      console.error("Error leaving circle", err);
      setError(err?.message || "Could not leave circle.");
    } finally {
      setLeavingCircleId(null);
    }
  };


  const handleCreateCircle = async () => {
    try {
      setCreating(true);
      setCreateError(null);
      await apiPost("/circles", {
        name: newName.trim(),
        description: newDescription.trim(),
        visibility: newVisibility,
      });
      setNewName("");
      setNewDescription("");
      setNewVisibility("private");
      setShowCreateModal(false);
      await loadCircles();
    } catch (err: any) {
      console.error("Create circle failed", err);
      setCreateError(err?.message || "Could not create circle");
    } finally {
      setCreating(false);
    }
  };

  // -------- render --------

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-100 flex flex-col">
      {/* Top bar spans full width */}
      <TopBar />

      {/* Main layout: sidebar + page content */}
      <div className="flex flex-1">
        {/* Global left sidebar */}
        <LeftSidebar />

        {/* Page content */}
        <main className="flex-1 px-8 py-8 max-w-6xl mx-auto w-full">
          <div className="mt-8">
            {/* Header */}
            <div className="w-full flex flex-col items-center relative mb-8">
              <div className="flex flex-col items-center w-full">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl">👥</span>
                  <h2 className="text-3xl font-bold tracking-tight">Circles</h2>
                </div>
                <p className="text-slate-400 mt-2 text-center max-w-xl">
                  Join circles to connect with others who share your interests in movies and shows.
                </p>
              </div>
              <button
                type="button"
                className="absolute right-0 top-0 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 via-pink-500 to-pink-400 text-white font-semibold rounded-xl shadow hover:brightness-110 transition"
                onClick={handleCreateCircleClick}
              >
                <span className="text-lg font-bold">+</span>
                <span className="hidden sm:inline">Create Circle</span>
              </button>
            </div>

            {/* Tabs and search */}
            <div className="flex flex-col items-center w-full">
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  className={`px-5 py-2 rounded-full font-medium transition ${
                    activeTab === "my"
                      ? "bg-gradient-to-r from-pink-600 via-pink-500 to-pink-400 text-white shadow"
                      : "bg-slate-800/70 text-slate-300 border border-slate-700 hover:bg-slate-800"
                  }`}
                  onClick={() => setActiveTab("my")}
                >
                  My Circles
                </button>
                <button
                  type="button"
                  className={`px-5 py-2 rounded-full font-medium transition ${
                    activeTab === "discover"
                      ? "bg-gradient-to-r from-pink-600 via-pink-500 to-pink-400 text-white shadow"
                      : "bg-slate-800/70 text-slate-300 border border-slate-700 hover:bg-slate-800"
                  }`}
                  onClick={() => setActiveTab("discover")}
                >
                  Discover
                </button>
              </div>
              <div className="w-full max-w-2xl mb-2">
                <input
                  type="text"
                  className="w-full px-5 py-2 bg-slate-900/70 rounded-full border border-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 text-slate-100"
                  placeholder="Search circles..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Create Modal (unchanged other than indentation) */}
            {showCreateModal && (
              <section className="flex justify-center mt-8">
                <div className="w-full max-w-xl bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl p-8 relative">
                  <header className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Create a circle</h3>
                    <button
                      type="button"
                      className="text-2xl text-slate-400 hover:text-slate-200 px-2"
                      onClick={() => {
                        setShowCreateModal(false);
                        setCreateError(null);
                      }}
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </header>
                  <div className="flex flex-col gap-4 mb-4">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Circle name"
                        className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Visibility
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className={`px-4 py-1 rounded-full font-medium border transition ${
                            newVisibility === "public"
                              ? "bg-green-600/90 text-white border-green-600"
                              : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
                          }`}
                          onClick={() => setNewVisibility("public")}
                        >
                          Public
                        </button>
                        <button
                          type="button"
                          className={`px-4 py-1 rounded-full font-medium border transition ${
                            newVisibility === "private"
                              ? "bg-amber-600/90 text-white border-amber-600"
                              : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
                          }`}
                          onClick={() => setNewVisibility("private")}
                        >
                          Private
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        Description
                      </label>
                      <textarea
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Describe your circle..."
                        rows={3}
                        className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                      />
                    </div>
                  </div>
                  {createError && (
                    <div className="mb-3 text-sm text-red-400 font-medium">{createError}</div>
                  )}
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition"
                      onClick={() => {
                        setShowCreateModal(false);
                        setCreateError(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-600 via-pink-500 to-pink-400 text-white font-semibold shadow hover:brightness-110 transition disabled:opacity-60"
                      onClick={handleCreateCircle}
                      disabled={creating || !newName.trim()}
                    >
                      {creating ? "Creating..." : "Create"}
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 mb-2 w-full max-w-xl mx-auto bg-red-900/70 border border-red-700 text-red-300 px-4 py-2 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}
            {/* Loading */}
            {loading ? (
              <div className="flex flex-1 items-center justify-center text-lg text-slate-400 font-medium mt-16">
                <span className="animate-pulse">Loading circles...</span>
              </div>
            ) : (
              <section className="grid gap-6 mt-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {circlesForTab.length === 0 ? (
                  <div className="col-span-full text-center text-slate-400 mt-12">
                    {activeTab === "my"
                      ? "You are not a member of any circles yet. Please join a circle."
                      : "No circles found. Try a different search."}
                  </div>
                ) : (
                  circlesForTab.map((circle) => {
                    const id = getCircleId(circle);
                    const name = getName(circle);
                    const description = getDescription(circle);
                    const visibility = getVisibility(circle);
                    const members = computeMembersCount(circle);
                    const posts = computePostsCount(circle);
                    const member = isMember(circle);
                    const isBusyJoining = joiningCircleId === id;
                    const isBusyLeaving = leavingCircleId === id;
                    return (
                      <article
                        key={id || name}
                        className="bg-slate-900/70 backdrop-blur border border-pink-500/10 rounded-2xl p-5 shadow-xl transition hover:border-pink-500/40 hover:-translate-y-1 cursor-pointer flex flex-col"
                        onClick={() => {
                          if (id) navigate(`/circles/${id}`);
                        }}
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="text-lg font-bold text-slate-100 truncate">{name}</h3>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                visibility === "public"
                                  ? "bg-green-700/80 text-green-100"
                                  : "bg-amber-700/80 text-amber-100"
                              }`}
                            >
                              {visibility === "public" ? "Public" : "Private"}
                            </span>
                          </div>
                          {description && (
                            <p className="text-slate-300 text-sm mt-1 mb-3 line-clamp-3">{description}</p>
                          )}
                          <div className="flex gap-4 mt-2 mb-2">
                            <div className="flex items-center gap-1 text-xs text-slate-300">
                              <span className="text-base">👥</span>
                              <span>
                                <span className="font-semibold">{members}</span>
                                <span className="ml-1">members</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-300">
                              <span className="text-base">📈</span>
                              <span>
                                <span className="font-semibold">{posts}</span>
                                <span className="ml-1">posts</span>
                              </span>
                            </div>
                          </div>
                          {member && (
                            <span className="inline-block mt-1 text-xs bg-pink-600/80 text-white px-2 py-0.5 rounded-full font-semibold">
                              Member
                            </span>
                          )}
                        </div>
                        <div className="mt-4">
                          {member ? (
                            <button
                              type="button"
                              className="w-full px-4 py-2 rounded-lg border border-pink-500 text-pink-300 hover:bg-pink-500/10 hover:text-pink-100 font-semibold transition disabled:opacity-60"
                              disabled={isBusyLeaving}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLeave(circle);
                              }}
                            >
                              {isBusyLeaving ? "Leaving..." : "Leave"}
                            </button>
                          ) : visibility === "public" ? (
                            <button
                              type="button"
                              className="w-full px-4 py-2 rounded-lg border border-pink-500 text-pink-300 hover:bg-pink-500/10 hover:text-pink-100 font-semibold transition disabled:opacity-60"
                              disabled={isBusyJoining}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleJoin(circle);
                              }}
                            >
                              {isBusyJoining ? "Joining..." : "Join"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="w-full px-4 py-2 rounded-lg border border-amber-500 text-amber-200 cursor-not-allowed font-semibold"
                              disabled
                            >
                              Private circle
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CirclesPage;
