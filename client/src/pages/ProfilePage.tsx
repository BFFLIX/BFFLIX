// src/pages/ProfilePage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import bfflixLogo from "../assets/bfflix-logo.svg";
import defaultAvatar from "../assets/default-avatar.svg";
import { apiGet } from "../lib/api";
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

const MAX_RECENT_VIEWINGS = 5;

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
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  // Circles state
  const [circles, setCircles] = useState<Circle[]>([]);
  const [circlesLoading, setCirclesLoading] = useState(false);
  const [circlesError, setCirclesError] = useState<string | null>(null);

  // Viewings state
  const [viewings, setViewings] = useState<ProfileViewing[]>([]);
  const [viewingsCount, setViewingsCount] = useState(0);
  const [viewingsLoading, setViewingsLoading] = useState(false);
  const [viewingsError, setViewingsError] = useState<string | null>(null);

  // Fetch /me
  useEffect(() => {
    const fetchMe = async () => {
      try {
        setUserLoading(true);
        setUserError(null);
        const res = await apiGet<{ name: string }>("/me");
        setUserName(res.name);
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
              <span className="app-nav-icon">dY?�</span><span>Home</span>
            </button>
            <button className="app-nav-item" onClick={() => navigate("/circles")}>
              <span className="app-nav-icon">dY`�</span><span>Circles</span>
            </button>
            <button className="app-nav-item" onClick={() => navigate("/viewings")}>
              <span className="app-nav-icon">dYZ�</span><span>Viewings</span>
            </button>
            <button className="app-nav-item" onClick={() => navigate("/ai")}>
              <span className="app-nav-icon">�o"</span><span>AI Assistant</span>
            </button>
            <button className="app-nav-item app-nav-item--active">
              <span className="app-nav-icon">dY`</span><span>Profile</span>
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
                <img src={defaultAvatar} alt="Default profile avatar" />
                <span className="profile-avatar-initial">{profileInitial}</span>
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
              </div>
            </section>

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
                <button
                  type="button"
                  className="profile-section-cta"
                  onClick={() => navigate("/viewings")}
                >
                  View all
                </button>
              </div>

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
                          <img src={viewing.posterUrl} alt={viewing.displayTitle} />
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
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
