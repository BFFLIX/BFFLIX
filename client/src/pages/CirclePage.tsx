
// client/src/styles/CirclesPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../lib/api";
import bfflixLogo from "../assets/bfflix-logo.svg";
import "../styles/CirclesPage.css";

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
  const [newVisibility, setNewVisibility] = useState<"private" | "public">("private");
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

  // navigation handlers (left sidebar)
  const handleNavHome = () => {
    navigate("/home");
  };

  const handleNavCircles = () => {
    navigate("/circles");
  };

  const handleNavViewings = () => {
    navigate("/viewings");
  };

  const handleNavAssistant = () => {
    navigate("/ai");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("authToken");
    navigate("/login");
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
    <div className="app-shell">
      <div className="app-main-layout">
        {/* Left sidebar - same structure as HomePage, but Circles active */}
        <aside className="app-sidebar">
          <div className="app-sidebar-brand">
            <img
              src={bfflixLogo}
              alt="BFFLIX"
              className="app-sidebar-logo-img"
            />
          </div>

          <nav className="app-sidebar-nav">
            <button
              className="app-nav-item"
              type="button"
              onClick={handleNavHome}
            >
              <span className="app-nav-icon">🏠</span>
              <span>Home</span>
            </button>
            <button
              className="app-nav-item app-nav-item--active"
              type="button"
              onClick={handleNavCircles}
            >
              <span className="app-nav-icon">👥</span>
              <span>Circles</span>
            </button>
            <button
              className="app-nav-item"
              type="button"
              onClick={handleNavViewings}
            >
              <span className="app-nav-icon">🎬</span>
              <span>Viewings</span>
            </button>
            <button
              className="app-nav-item"
              type="button"
              onClick={handleNavAssistant}
            >
              <span className="app-nav-icon">✨</span>
              <span>AI Assistant</span>
            </button>
            <button
              className="app-nav-item"
              type="button"
              onClick={() => navigate("/profile")}
            >
              <span className="app-nav-icon">👤</span>
              <span>Profile</span>
            </button>
          </nav>

          <button
            className="app-logout-button"
            type="button"
            onClick={handleLogout}
          >
            Log out
          </button>
        </aside>

        {/* Main circles content */}
        <main className="app-feed circles-page">
          <header className="circles-header">
            <div className="circles-header-main">
              <div className="circles-title-row">
                <span className="circles-icon">👥</span>
                <h2 className="circles-title">Circles</h2>
              </div>
              <p className="circles-subtitle">
                Join circles to connect with others who share your interests in
                movies and shows.
              </p>
            </div>

            <button
              type="button"
              className="circles-create-button"
              onClick={handleCreateCircleClick}
            >
              <span className="circles-create-plus">+</span>
              Create Circle
            </button>
          </header>

          <section className="circles-controls">
            <div className="circles-tabs">
              <button
                type="button"
                className={
                  activeTab === "my"
                    ? "circles-tab circles-tab--active"
                    : "circles-tab"
                }
                onClick={() => setActiveTab("my")}
              >
                My Circles
              </button>
              <button
                type="button"
                className={
                  activeTab === "discover"
                    ? "circles-tab circles-tab--active"
                    : "circles-tab"
                }
                onClick={() => setActiveTab("discover")}
              >
                Discover
              </button>
            </div>

            <div className="circles-search-wrapper">
              <input
                type="text"
                className="circles-search-input"
                placeholder="Search circles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </section>

          {showCreateModal && (
            <section className="circle-inline-create">
              <div className="circle-inline-card">
                <header className="circle-inline-header">
                  <h3>Create a circle</h3>
                  <button
                    type="button"
                    className="circle-inline-close"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateError(null);
                    }}
                  >
                    ×
                  </button>
                </header>
                <div className="circle-inline-row">
                  <div className="circle-inline-field">
                    <label>Name</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Circle name"
                    />
                  </div>
                  <div className="circle-inline-field">
                    <label>Visibility</label>
                    <div className="circle-inline-toggle">
                      <button
                        type="button"
                        className={
                          newVisibility === "public"
                            ? "vis-btn active"
                            : "vis-btn"
                        }
                        onClick={() => setNewVisibility("public")}
                      >
                        Public
                      </button>
                      <button
                        type="button"
                        className={
                          newVisibility === "private"
                            ? "vis-btn active"
                            : "vis-btn"
                        }
                        onClick={() => setNewVisibility("private")}
                      >
                        Private
                      </button>
                    </div>
                  </div>
                </div>
                <div className="circle-inline-field">
                  <label>Description</label>
                  <textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Describe your circle..."
                    rows={3}
                  />
                </div>
                {createError && (
                  <div className="circles-error" style={{ padding: 0 }}>
                    {createError}
                  </div>
                )}
                <div className="circle-inline-actions">
                  <button
                    type="button"
                    className="circle-card-button circle-card-button--secondary"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateError(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="circle-card-button circle-card-button--primary"
                    onClick={handleCreateCircle}
                    disabled={creating || !newName.trim()}
                  >
                    {creating ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            </section>
          )}

          {error && <div className="circles-error">{error}</div>}

          {loading ? (
            <div className="circles-loading">Loading circles...</div>
          ) : (
            <section className="circles-grid">
              {circlesForTab.length === 0 ? (
                <div className="circles-empty">
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
                      className="circle-card"
                      onClick={() => {
                        if (id) navigate(`/circles/${id}`);
                      }}
                    >
                      <div className="circle-card-body">
                        {/* Name + visibility pill */}
                        <div className="circle-card-header-row">
                          <h3 className="circle-card-name">{name}</h3>
                          <span
                            className={
                              visibility === "public"
                                ? "circle-card-visibility circle-card-visibility--public"
                                : "circle-card-visibility circle-card-visibility--private"
                            }
                          >
                            {visibility === "public" ? "Public" : "Private"}
                          </span>
                        </div>

                        {description && (
                          <p className="circle-card-description">
                            {description}
                          </p>
                        )}

                        <div className="circle-card-meta-row">
                          <div className="circle-card-meta-item">
                            <span className="circle-card-meta-icon">👥</span>
                            <span className="circle-card-meta-text">
                              {members} members
                            </span>
                          </div>
                          <div className="circle-card-meta-item">
                            <span className="circle-card-meta-icon">📈</span>
                            <span className="circle-card-meta-text">
                              {posts} posts
                            </span>
                          </div>
                        </div>

                        {member && (
                          <span className="circle-card-member-pill">Member</span>
                        )}
                      </div>

                      <div className="circle-card-actions">
                        {member ? (
                          // You are already in this circle
                          <button
                            type="button"
                            className="circle-card-button circle-card-button--secondary"
                            disabled={isBusyLeaving}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLeave(circle);
                            }}
                          >
                            {isBusyLeaving ? "Leaving..." : "Leave"}
                          </button>
                        ) : visibility === "public" ? (
                          // Public circle you are not in: you can join
                          <button
                            type="button"
                            className="circle-card-button circle-card-button--secondary"
                            disabled={isBusyJoining}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJoin(circle);
                            }}
                          >
                            {isBusyJoining ? "Joining..." : "Join"}
                          </button>
                        ) : (
                          // Private circle and you are not a member: you cannot join without invite
                          <button
                            type="button"
                            className="circle-card-button circle-card-button--secondary"
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

        </main>
      </div>
    </div>
  );
};

export default CirclesPage;
