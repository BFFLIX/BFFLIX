// src/pages/ProfilePage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import bfflixLogo from "../assets/bfflix-logo.svg";
import defaultAvatar from "../assets/default-avatar.svg";
import { apiGet, apiPatch } from "../lib/api";
import { fetchTmdbTitleDetails } from "../lib/TMDBService";
import "../styles/ProfilePage.css";

type Circle = { id?: string; _id?: string; circleId?: string; name?: string };
type Viewing = {
  _id: string;
  type?: string;
  tmdbId?: string;
  title?: string;
  watchedAt?: string;
  createdAt?: string;
  rating?: number;
  comment?: string;
  posterUrl?: string;
};

type ProfileViewing = Viewing & {
  displayTitle: string;
  formattedDate?: string;
  safeRating: number;
};

const MAX_RECENT_VIEWINGS = 3;
const MAX_AVATAR_BYTES = 600 * 1024; // ~600KB
const VIEWINGS_VISIBILITY_KEY = "profile:viewingsVisibility";

const DATA_URL_REGEX = /^data:image\/[a-zA-Z]+;base64,/;

function formatViewingDate(dateIso?: string) {
  if (!dateIso) return undefined;
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeViewingType(type?: string): "movie" | "tv" | null {
  if (!type) return null;
  const lower = type.toLowerCase();
  if (lower === "movie") return "movie";
  if (lower === "tv" || lower === "show") return "tv";
  return null;
}

function formatViewingTypeLabel(type?: string) {
  const normalized = normalizeViewingType(type);
  if (normalized === "movie") return "Movie";
  if (normalized === "tv") return "Show";
  return "";
}

export default function ProfilePage() {
  const navigate = useNavigate();

  // User info state
  const [userName, setUserName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);

  // Circles state
  const [circles, setCircles] = useState<Circle[]>([]);
  const [circlesLoading, setCirclesLoading] = useState(false);
  const [circlesError, setCirclesError] = useState<string | null>(null);

  // Viewings state
  const [viewings, setViewings] = useState<ProfileViewing[]>([]);
  const [viewingsCount, setViewingsCount] = useState(0);
  const [viewingsLoading, setViewingsLoading] = useState(false);
  const [viewingsError, setViewingsError] = useState<string | null>(null);
  const [viewingsPublic, setViewingsPublic] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(VIEWINGS_VISIBILITY_KEY);
    if (stored === "private") return false;
    if (stored === "public") return true;
    return true;
  });

  // Fetch /me
  useEffect(() => {
    const fetchMe = async () => {
      try {
        setUserLoading(true);
        setUserError(null);
        const res = await apiGet<{ name: string; avatarUrl?: string | null }>("/me");
        setUserName(res.name);
        setAvatarUrl(res.avatarUrl || "");
      } catch (err: any) {
        console.error("Failed to load user", err);
        setUserError(err.message || "Failed to load user data.");
      } finally {
        setUserLoading(false);
      }
    };
    fetchMe();
  }, []);

  // Fetch /circles
  useEffect(() => {
    const fetchCircles = async () => {
      try {
        setCirclesLoading(true);
        setCirclesError(null);
        const data = await apiGet<any>("/circles");
        let list: any[] = [];
        if (Array.isArray(data)) list = data;
        else if (Array.isArray(data.items)) list = data.items;
        else if (Array.isArray(data.data)) list = data.data;
        setCircles(list);
      } catch (err: any) {
        console.error("Failed to load circles", err);
        setCirclesError(err.message || "Failed to load circles.");
      } finally {
        setCirclesLoading(false);
      }
    };
    fetchCircles();
  }, []);

  // Fetch /viewings with TMDB enrichment for poster/title
  useEffect(() => {
    const fetchViewings = async () => {
      try {
        setViewingsLoading(true);
        setViewingsError(null);
        const data = await apiGet<any>("/viewings");
        let items: Viewing[] = [];
        if (Array.isArray(data)) items = data;
        else if (Array.isArray(data.items)) items = data.items;
        else if (Array.isArray(data.data)) items = data.data;

        setViewingsCount(items.length);

        const sorted = [...items].sort((a, b) => {
          const aDate = new Date(a.watchedAt || a.createdAt || 0).getTime();
          const bDate = new Date(b.watchedAt || b.createdAt || 0).getTime();
          return bDate - aDate;
        });

        const top = sorted.slice(0, MAX_RECENT_VIEWINGS);
        const cache = new Map<string, { title: string; posterUrl?: string }>();

        const enriched = await Promise.all(
          top.map(async (viewing) => {
            let posterUrl = viewing.posterUrl;
            let displayTitle =
              viewing.title ||
              (viewing.tmdbId ? `TMDB #${viewing.tmdbId}` : "Untitled viewing");

            const normalizedType = normalizeViewingType(viewing.type);
            if (viewing.tmdbId && normalizedType) {
              const cacheKey = `${normalizedType}:${viewing.tmdbId}`;
              if (!cache.has(cacheKey)) {
                try {
                  const meta = await fetchTmdbTitleDetails(
                    viewing.tmdbId,
                    normalizedType
                  );
                  cache.set(cacheKey, meta);
                } catch (err) {
                  console.error("Failed to enrich viewing", err);
                }
              }

              const meta = cache.get(cacheKey);
              if (meta) {
                if (!posterUrl && meta.posterUrl) {
                  posterUrl = meta.posterUrl;
                }
                if (!viewing.title && meta.title) {
                  displayTitle = meta.title;
                }
              }
            }

            const formattedDate = formatViewingDate(
              viewing.watchedAt || viewing.createdAt
            );

            const safeRating =
              typeof viewing.rating === "number" && viewing.rating > 0
                ? Math.min(5, Math.max(0, Math.round(viewing.rating)))
                : 0;

            return {
              ...viewing,
              posterUrl,
              displayTitle,
              formattedDate,
              safeRating,
            };
          })
        );

        setViewings(enriched);
      } catch (err: any) {
        console.error("Failed to load viewings", err);
        setViewingsError(err.message || "Failed to load viewings.");
      } finally {
        setViewingsLoading(false);
      }
    };
    fetchViewings();
  }, []);

  const profileInitial = userName ? userName.charAt(0).toUpperCase() : "U";

  const openEditProfile = () => {
    setIsEditingProfile(true);
    setEditName(userName);
    setEditAvatarUrl(avatarUrl);
    setProfileSaveError(null);
  };

  const closeEditProfile = () => {
    setIsEditingProfile(false);
    setProfileSaveError(null);
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editName.trim()) {
      setProfileSaveError("Display name is required.");
      return;
    }

    try {
      setSavingProfile(true);
      setProfileSaveError(null);
      const payload = {
        name: editName.trim(),
        avatarUrl: editAvatarUrl.trim(),
      };
      const updated = await apiPatch<{ name: string; avatarUrl?: string | null }>(
        "/me",
        payload
      );
      setUserName(updated.name);
      setAvatarUrl(updated.avatarUrl || "");
      setIsEditingProfile(false);
    } catch (err: any) {
      setProfileSaveError(err.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleViewingsVisibility = () => {
    const next = !viewingsPublic;
    setViewingsPublic(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        VIEWINGS_VISIBILITY_KEY,
        next ? "public" : "private"
      );
    }
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileSaveError("Please upload an image file (png, jpg, gif, webp).");
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setProfileSaveError("Avatar must be under 600KB. Try a smaller image.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string" && DATA_URL_REGEX.test(result)) {
        setEditAvatarUrl(result);
        setProfileSaveError(null);
      } else {
        setProfileSaveError("Failed to read image. Please try another file.");
      }
    };
    reader.onerror = () => {
      setProfileSaveError("Failed to read image. Please try again.");
    };
    reader.readAsDataURL(file);
  };

  const clearAvatarSelection = () => {
    setEditAvatarUrl("");
  };

  return (
    <div className="app-shell">
      <div className="app-main-layout">
        {/* Sidebar (similar to other pages) */}
        <aside className="app-sidebar">
          <div className="app-sidebar-brand">
            <img src={bfflixLogo} alt="BFFLIX" className="app-sidebar-logo-img" />
          </div>
          <nav className="app-sidebar-nav">
            <button className="app-nav-item" onClick={() => navigate("/home")}>
              <span className="app-nav-icon" role="img" aria-hidden="true">
                🏠
              </span>
              <span>Home</span>
            </button>
            <button className="app-nav-item" onClick={() => navigate("/circles")}>
              <span className="app-nav-icon" role="img" aria-hidden="true">
                👥
              </span>
              <span>Circles</span>
            </button>
            <button className="app-nav-item" onClick={() => navigate("/viewings")}>
              <span className="app-nav-icon" role="img" aria-hidden="true">
                🎬
              </span>
              <span>Viewings</span>
            </button>
            <button className="app-nav-item" onClick={() => navigate("/ai")}>
              <span className="app-nav-icon" role="img" aria-hidden="true">
                ✨
              </span>
              <span>AI Assistant</span>
            </button>
            <button className="app-nav-item app-nav-item--active">
              <span className="app-nav-icon" role="img" aria-hidden="true">
                👤
              </span>
              <span>Profile</span>
            </button>
          </nav>
          <button className="app-logout-button">Log out</button>
        </aside>

        {/* Main content */}
        <main className="app-feed profile-page">
          <div className="profile-main">
            {/* Profile Header */}
            <section className="profile-header-card">
              <div className="profile-avatar">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={`${userName || "User"} avatar`}
                    className="profile-avatar-img profile-avatar-img--user"
                  />
                ) : (
                  <>
                    <img
                      src={defaultAvatar}
                      alt="Default profile avatar"
                      className="profile-avatar-img"
                    />
                    <span className="profile-avatar-initial">{profileInitial}</span>
                  </>
                )}
              </div>

              <div className="profile-info">
                <div className="profile-title-row">
                  <h2 className="profile-title">Your Profile</h2>
                  {userLoading && (
                    <span className="profile-loading">Loading...</span>
                  )}
                  {userError && <span className="profile-error">{userError}</span>}
                </div>

                {!userLoading && !userError && (
                  <p className="profile-name">
                    Welcome back, {userName || "BFFLixer"}!
                  </p>
                )}
                <p className="profile-subtitle">
                  Keep tabs on what you are watching and the circles you hang out
                  in.
                </p>

                <div className="profile-stats">
                  <div className="profile-stat-item">
                    <div className="stat-value">{circles.length}</div>
                    <div className="stat-label">Circles</div>
                  </div>
                  <div className="profile-stat-item">
                    <div className="stat-value">{viewingsCount}</div>
                    <div className="stat-label">Viewings logged</div>
                  </div>
                </div>

                <div className="profile-header-actions">
                  {!isEditingProfile && (
                    <button
                      type="button"
                      className="profile-edit-button"
                      onClick={openEditProfile}
                    >
                      Edit profile
                    </button>
                  )}
                </div>
              </div>
            </section>

            {isEditingProfile && (
              <form className="profile-edit-card" onSubmit={handleSaveProfile}>
                <div className="profile-edit-grid">
                  <label className="profile-edit-field">
                    <span className="profile-edit-label">Display name</span>
                    <input
                      type="text"
                      value={editName}
                      className="profile-edit-input"
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={60}
                      required
                    />
                  </label>
                  <label className="profile-edit-field">
                    <span className="profile-edit-label">Upload photo</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/bmp"
                      className="profile-edit-file"
                      onChange={handleAvatarFileChange}
                    />
                    <small className="profile-edit-hint">
                      Supported formats: PNG, JPG, GIF, WEBP (max 600KB). Leave empty or
                      clear to keep the default avatar.
                    </small>
                  </label>
                  <div className="profile-edit-field">
                    <span className="profile-edit-label">Preview</span>
                    <div className="profile-edit-avatar-preview">
                      {editAvatarUrl ? (
                        <img src={editAvatarUrl} alt="Avatar preview" />
                      ) : avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar preview" />
                      ) : (
                        <div className="profile-edit-avatar-placeholder">
                          {profileInitial}
                        </div>
                      )}
                    </div>
                    <div className="profile-edit-avatar-actions">
                      <button
                        type="button"
                        className="profile-edit-clear-avatar"
                        onClick={clearAvatarSelection}
                      >
                        Use default avatar
                      </button>
                    </div>
                  </div>
                </div>
                {profileSaveError && (
                  <div className="profile-edit-error">{profileSaveError}</div>
                )}
                <div className="profile-edit-actions">
                  <button
                    type="button"
                    className="profile-edit-cancel"
                    onClick={closeEditProfile}
                    disabled={savingProfile}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="profile-edit-save"
                    disabled={savingProfile}
                  >
                    {savingProfile ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            )}

            {/* Circles Section */}
            <section className="profile-section profile-circles-section">
              <div className="profile-section-header">
                <div>
                  <h3 className="profile-section-title">My Circles</h3>
                  <p className="profile-section-subtitle">
                    Quick access to the communities you care about most.
                  </p>
                </div>
                <button
                  type="button"
                  className="profile-section-cta"
                  onClick={() => navigate("/circles")}
                >
                  View all
                </button>
              </div>

              {circlesLoading && (
                <div className="circles-loading">Loading circles...</div>
              )}
              {circlesError && <div className="circles-error">{circlesError}</div>}
              {!circlesLoading && !circlesError && circles.length === 0 && (
                <div className="circles-empty">
                  You are not a member of any circles.
                </div>
              )}
              {!circlesLoading && !circlesError && circles.length > 0 && (
                <div className="profile-circles-list">
                  {circles.map((circle) => {
                    const id = String(circle.id || circle._id || circle.circleId);
                    return (
                      <button
                        type="button"
                        key={id}
                        className="profile-circle-button"
                        onClick={() => navigate(`/circles/${id}`)}
                      >
                        {circle.name || "Untitled circle"}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Viewings Section */}
            <section className="profile-section profile-viewings-section">
              <div className="profile-section-header">
                <div>
                  <h3 className="profile-section-title">Recent viewings</h3>
                  <p className="profile-section-subtitle">
                    A snapshot of the latest titles you've logged.
                  </p>
                </div>
                <div className="profile-viewings-controls">
                  <div className="profile-privacy-toggle">
                    <button
                      type="button"
                      className={
                        viewingsPublic
                          ? "privacy-toggle-pill privacy-toggle-pill--active"
                          : "privacy-toggle-pill"
                      }
                      onClick={() => !viewingsPublic && toggleViewingsVisibility()}
                    >
                      Public
                    </button>
                    <button
                      type="button"
                      className={
                        !viewingsPublic
                          ? "privacy-toggle-pill privacy-toggle-pill--active"
                          : "privacy-toggle-pill"
                      }
                      onClick={() => viewingsPublic && toggleViewingsVisibility()}
                    >
                      Private
                    </button>
                  </div>
                  <button
                    type="button"
                    className="profile-section-cta"
                    onClick={() => navigate("/viewings")}
                  >
                    View all
                  </button>
                </div>
              </div>

              {!viewingsPublic ? (
                <div className="viewings-private-message">
                  You're keeping your recent viewings private. Toggle back to
                  Public when you're ready to share.
                </div>
              ) : (
                <>
                  {viewingsLoading && (
                    <div className="viewings-loading">Loading viewings...</div>
                  )}
                  {viewingsError && (
                    <div className="viewings-error">{viewingsError}</div>
                  )}
                  {!viewingsLoading && !viewingsError && viewings.length === 0 && (
                    <div className="viewings-empty">No viewings logged yet.</div>
                  )}
                  {!viewingsLoading && !viewingsError && viewings.length > 0 && (
                    <div className="profile-viewings-list">
                      {viewings.map((viewing) => (
                        <article key={viewing._id} className="profile-viewing-card">
                          <div className="profile-viewing-poster">
                            {viewing.posterUrl ? (
                              <img
                                src={viewing.posterUrl}
                                alt={viewing.displayTitle}
                              />
                            ) : (
                              <div className="profile-viewing-poster--placeholder" />
                            )}
                          </div>
                          <div className="profile-viewing-main">
                            <div className="profile-viewing-title-row">
                              <div>
                                <h4 className="profile-viewing-title">
                                  {viewing.displayTitle}
                                </h4>
                                {viewing.type && (
                                  <span className="profile-viewing-type">
                                    {formatViewingTypeLabel(viewing.type)}
                                  </span>
                                )}
                              </div>
                              {viewing.formattedDate && (
                                <span className="profile-viewing-date">
                                  {viewing.formattedDate}
                                </span>
                              )}
                            </div>
                            {viewing.comment && (
                              <p className="profile-viewing-comment">
                                {viewing.comment}
                              </p>
                            )}
                            <div className="profile-viewing-meta">
                              {viewing.safeRating > 0 && (
                                <div className="profile-viewing-stars">
                                  {Array.from({ length: 5 }).map((_, index) => (
                                    <span
                                      key={index}
                                      className={
                                        index < viewing.safeRating
                                          ? "profile-viewing-star profile-viewing-star--filled"
                                          : "profile-viewing-star"
                                      }
                                    >
                                      ★
                                    </span>
                                  ))}
                                </div>
                              )}
                              <button
                                type="button"
                                className="profile-viewing-link"
                                onClick={() => navigate("/viewings")}
                              >
                                View details
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
