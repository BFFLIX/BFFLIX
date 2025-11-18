
// src/pages/ViewingsPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import bfflixLogo from "../assets/bfflix-logo.svg";
import { apiGet, apiPost, apiDelete } from "../lib/api";
import {
  searchTmdbTitles,
  fetchTmdbTitleDetails,
} from "../lib/TMDBService";
import type { TmdbTitleOption } from "../lib/TMDBService";
import "../styles/ViewingsPage.css";

type Viewing = {
  _id: string;
  userId?: string;
  type?: "movie" | "tv" | "Movie" | "Show";
  tmdbId?: string;
  rating?: number;
  comment?: string;
  watchedAt?: string;
  createdAt?: string;
  updatedAt?: string;

  // UI-enriched fields
  title?: string;
  posterUrl?: string;
  circles?: string[] | { id: string; name: string }[];
};

type ViewingDetails = Viewing & {
  body?: string;
};

function formatDate(dateIso?: string) {
  if (!dateIso) return "Date unknown";
  const d = new Date(dateIso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatType(type?: string) {
  if (!type) return "";
  const lower = type.toLowerCase();
  if (lower === "movie") return "Movie";
  if (lower === "show" || lower === "tv") return "Show";
  return type;
}

function normalizeCircleNames(circles?: Viewing["circles"]): string[] {
  if (!circles) return [];
  if (Array.isArray(circles) && circles.length > 0) {
    if (typeof circles[0] === "string") {
      return circles as string[];
    }
    return (circles as { id: string; name: string }[]).map((c) => c.name);
  }
  return [];
}

const ViewingsPage: React.FC = () => {
  const navigate = useNavigate();

  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<"all" | "movie" | "show">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  const [selectedViewing, setSelectedViewing] =
    useState<ViewingDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<"movie" | "tv">("movie");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<TmdbTitleOption[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<TmdbTitleOption | null>(
    null
  );

  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [watchedAt, setWatchedAt] = useState("");

  const [seasonNumber, setSeasonNumber] = useState("");
  const [episodeNumber, setEpisodeNumber] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ----------------- Load + enrich viewings -----------------

  const loadViewings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await apiGet<any>("/viewings");

      let items: Viewing[] = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (data && Array.isArray(data.items)) {
        items = data.items;
      }

      // Enrich with TMDB title + poster
      const keys = Array.from(
        new Set(
          items
            .filter((v) => v.tmdbId && v.type)
            .map((v) => {
              const t = v.type!.toString().toLowerCase();
              const normType = t === "tv" || t === "show" ? "tv" : "movie";
              return `${normType}:${v.tmdbId}`;
            })
        )
      );

      const metaMap = new Map<
        string,
        { title: string; posterUrl?: string }
      >();

      await Promise.all(
        keys.map(async (key) => {
          const [t, tmdbId] = key.split(":");
          if (!tmdbId) return;
          try {
            const meta = await fetchTmdbTitleDetails(
              tmdbId,
              t === "tv" ? "tv" : "movie"
            );
            metaMap.set(key, meta);
          } catch (e) {
            console.error("TMDB details error", e);
          }
        })
      );

      const enriched = items.map((v) => {
        if (!v.tmdbId || !v.type) return v;
        const t = v.type.toString().toLowerCase();
        const normType = t === "tv" || t === "show" ? "tv" : "movie";
        const key = `${normType}:${v.tmdbId}`;
        const meta = metaMap.get(key);
        if (!meta) return v;
        return {
          ...v,
          title: meta.title,
          posterUrl: meta.posterUrl,
        };
      });

      setViewings(enriched);
    } catch (err) {
      console.error("Failed to load viewings", err);
      setError("Failed to load your past viewings. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadViewings();
  }, []);

  const filtered = viewings
    .filter((v) => {
      if (typeFilter === "all") return true;
      if (typeFilter === "movie") {
        return v.type && v.type.toString().toLowerCase() === "movie";
      }
      if (typeFilter === "show") {
        const t = v.type?.toString().toLowerCase();
        return t === "show" || t === "tv";
      }
      return true;
    })
    .sort((a, b) => {
      const aTime = a.watchedAt ? new Date(a.watchedAt).getTime() : 0;
      const bTime = b.watchedAt ? new Date(b.watchedAt).getTime() : 0;
      return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
    });

  // ----------------- Viewing details -----------------

  const openDetails = async (v: Viewing) => {
    try {
      setIsDetailsOpen(true);
      setIsDetailsLoading(true);
      setDetailsError(null);

      try {
        const full = await apiGet<ViewingDetails>(`/viewings/${v._id}`);
        setSelectedViewing(full);
      } catch {
        setSelectedViewing(v);
      }
    } catch (err) {
      console.error("Failed to load viewing details", err);
      setDetailsError("Could not load viewing details.");
      setSelectedViewing(v);
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setIsDetailsOpen(false);
    setSelectedViewing(null);
    setDetailsError(null);
  };

  // ----------------- Delete viewing -----------------

  const handleDeleteViewing = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this viewing? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      setIsDeletingId(id);
      setDeleteError(null);
      await apiDelete(`/viewings/${id}`);
      setViewings((prev) => prev.filter((v) => v._id !== id));
      if (selectedViewing && selectedViewing._id === id) {
        closeDetails();
      }
    } catch (err) {
      console.error("Delete viewing error", err);
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete viewing."
      );
    } finally {
      setIsDeletingId(null);
    }
  };

  // ----------------- Create viewing modal -----------------

  const openCreateModal = () => {
    setIsCreateOpen(true);
    setCreateType("movie");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedTitle(null);
    setRating(0);
    setNote("");
    setWatchedAt("");
    setSeasonNumber("");
    setEpisodeNumber("");
    setSubmitError(null);
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
  };

  useEffect(() => {
    if (!isCreateOpen) return;
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        setIsSearching(true);
        setSubmitError(null);

        const results = await searchTmdbTitles(searchQuery.trim(), createType);
        setSearchResults(results);
      } catch (err) {
        console.error("TMDB search error", err);
        setSubmitError("Failed to search TMDB. Please try again.");
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(handle);
  }, [searchQuery, createType, isCreateOpen]);

  const handleSelectTitle = (opt: TmdbTitleOption) => {
    setSelectedTitle(opt);
    setSearchQuery(opt.label);
    setSearchResults([]);
  };

  const handleSubmitViewing = async () => {
    if (!selectedTitle) {
      setSubmitError("Please search and select a movie or show.");
      return;
    }
    if (!rating && !note.trim()) {
      setSubmitError("Please add a rating or a short note.");
      return;
    }
    if (createType === "tv" && episodeNumber && !seasonNumber) {
      setSubmitError("Season number is required when an episode is specified.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const payload: Record<string, any> = {
        type: createType === "movie" ? "movie" : "tv",
        tmdbId: String(selectedTitle.id),
      };

      if (rating) payload.rating = rating;
      if (note.trim()) payload.comment = note.trim();
      if (watchedAt) payload.watchedAt = watchedAt;
      if (createType === "tv" && seasonNumber) {
        payload.seasonNumber = Number(seasonNumber);
      }
      if (createType === "tv" && episodeNumber) {
        payload.episodeNumber = Number(episodeNumber);
      }

      await apiPost("/viewings", payload);

      closeCreateModal();
      await loadViewings();
    } catch (err) {
      console.error("Create viewing error", err);
      if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError("Failed to create viewing. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------- Layout helpers -----------------

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div className="app-shell">
      <div className="app-main-layout">
        {/* LEFT SIDEBAR */}
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
              onClick={() => navigate("/home")}
            >
              <span className="app-nav-icon">🏠</span>
              <span>Home</span>
            </button>

            <button
              className="app-nav-item"
              type="button"
              onClick={() => navigate("/circles")}
            >
              <span className="app-nav-icon">👥</span>
              <span>Circles</span>
            </button>

            <button
              className="app-nav-item app-nav-item--active"
              type="button"
              onClick={() => navigate("/viewings")}
            >
              <span className="app-nav-icon">🎬</span>
              <span>Viewings</span>
            </button>

            <button
              className="app-nav-item"
              type="button"
              onClick={() => navigate("/ai")}
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

        {/* CENTER COLUMN */}
        <main className="app-feed">
          <header className="feed-header">
            <h1 className="feed-title">Viewings</h1>
          </header>

          <div className="viewings-page">
            <div className="viewings-header">
              <div className="viewings-header-main">
                <div className="viewings-title-row">
                  <span className="viewings-icon">🎬</span>
                  <h2 className="viewings-title">Past viewings</h2>
                </div>
                <p className="viewings-subtitle">
                  Revisit everything you have logged through BFFlix.
                </p>
              </div>

              <button
                type="button"
                className="viewings-add-button"
                onClick={openCreateModal}
              >
                <span className="viewings-add-plus">+</span>
                Add viewing
              </button>
            </div>

            <div className="viewings-controls">
              <div className="viewings-tabs">
                <button
                  type="button"
                  className={
                    typeFilter === "all"
                      ? "viewings-tab viewings-tab--active"
                      : "viewings-tab"
                  }
                  onClick={() => setTypeFilter("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={
                    typeFilter === "movie"
                      ? "viewings-tab viewings-tab--active"
                      : "viewings-tab"
                  }
                  onClick={() => setTypeFilter("movie")}
                >
                  Movies
                </button>
                <button
                  type="button"
                  className={
                    typeFilter === "show"
                      ? "viewings-tab viewings-tab--active"
                      : "viewings-tab"
                  }
                  onClick={() => setTypeFilter("show")}
                >
                  Shows
                </button>
              </div>

              <div className="viewings-filters-right">
                <select
                  className="viewings-select"
                  value={sortOrder}
                  onChange={(e) =>
                    setSortOrder(e.target.value as "newest" | "oldest")
                  }
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>
            </div>

            {isLoading && (
              <div className="viewings-loading">Loading your viewings…</div>
            )}

            {error && !isLoading && (
              <div className="viewings-error">{error}</div>
            )}

            {deleteError && (
              <div className="viewings-error">{deleteError}</div>
            )}

            {!isLoading && !error && filtered.length === 0 && (
              <div className="viewings-empty">
                You have not logged any viewings yet. Create a viewing to start
                tracking what you watch.
              </div>
            )}

            {!isLoading && !error && filtered.length > 0 && (
              <div className="viewings-list">
                {filtered.map((v) => {
                  const circles = normalizeCircleNames(v.circles);
                  const safeRating =
                    typeof v.rating === "number" && v.rating >= 0
                      ? Math.min(5, Math.max(0, v.rating))
                      : 0;

                  const displayTitle =
                    v.title ||
                    (v.tmdbId ? `TMDB #${v.tmdbId}` : "Untitled viewing");

                  return (
                    <article
                      key={v._id}
                      className="viewing-card"
                      onClick={() => openDetails(v)}
                    >
                      <div className="viewing-poster">
                        {v.posterUrl ? (
                          <img src={v.posterUrl} alt={displayTitle} />
                        ) : (
                          <div />
                        )}
                      </div>

                      <div className="viewing-main">
                        <div className="viewing-title-row">
                          <div>
                            <h3 className="viewing-title">{displayTitle}</h3>
                            {v.type && (
                              <span className="viewing-meta-type">
                                {formatType(v.type)}
                              </span>
                            )}
                          </div>
                          <span className="viewing-status-pill">Watched</span>
                        </div>

                        <div className="viewing-meta-row">
                          <span className="viewing-meta-item">
                            <span className="viewing-meta-label">Date:</span>
                            {formatDate(v.watchedAt)}
                          </span>

                          {circles.length > 0 && (
                            <span className="viewing-meta-item">
                              <span className="viewing-meta-label">
                                Circles:
                              </span>
                              {circles.join(", ")}
                            </span>
                          )}
                        </div>

                        {/* comment under title/stars */}
                        {v.comment && (
                          <p className="viewing-comment">{v.comment}</p>
                        )}

                        <div className="viewing-bottom-row">
                          <div className="viewing-stars">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span
                                key={i}
                                className={
                                  i < safeRating
                                    ? "viewing-star viewing-star--filled"
                                    : "viewing-star"
                                }
                              >
                                ★
                              </span>
                            ))}
                          </div>

                          <div className="viewing-actions">
                            <button
                              type="button"
                              className="viewing-action-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetails(v);
                              }}
                            >
                              View details
                            </button>
                            <button
                              type="button"
                              className="viewing-action-button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteViewing(v._id);
                              }}
                              disabled={isDeletingId === v._id}
                            >
                              {isDeletingId === v._id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* Details drawer */}
        {isDetailsOpen && selectedViewing && (
          <aside className="viewing-details-drawer">
            <button
              type="button"
              className="viewing-details-close"
              onClick={closeDetails}
            >
              ×
            </button>

            {isDetailsLoading ? (
              <div className="viewing-details-loading">Loading details…</div>
            ) : detailsError ? (
              <div className="viewing-details-error">{detailsError}</div>
            ) : (
              <>
                <div className="viewing-details-header">
                  <h2>
                    {selectedViewing.title ||
                      selectedViewing.comment ||
                      (selectedViewing.tmdbId
                        ? `TMDB #${selectedViewing.tmdbId}`
                        : "Untitled viewing")}
                  </h2>
                  {selectedViewing.type && (
                    <span className="viewing-meta-type">
                      {formatType(selectedViewing.type)}
                    </span>
                  )}
                </div>

                <div className="viewing-details-body">
                  <div className="viewing-details-meta">
                    <div>
                      <span className="viewing-meta-label">Watched:</span>{" "}
                      {formatDate(selectedViewing.watchedAt)}
                    </div>
                    <div className="viewing-stars viewing-stars--details">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={
                            i < (selectedViewing.rating || 0)
                              ? "viewing-star viewing-star--filled"
                              : "viewing-star"
                          }
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>

                  {(selectedViewing.body || selectedViewing.comment) && (
                    <div className="viewing-details-note">
                      <div className="viewing-meta-label">Your notes</div>
                      <p>{selectedViewing.body || selectedViewing.comment}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </aside>
        )}

        {/* CREATE VIEWING MODAL */}
        {isCreateOpen && (
          <div className="create-viewing-backdrop">
            <div className="create-viewing-card">
              <header className="create-viewing-header">
                <div className="create-viewing-type-toggle">
                  <button
                    type="button"
                    className={
                      createType === "movie"
                        ? "create-viewing-type-button create-viewing-type-button--active"
                        : "create-viewing-type-button"
                    }
                    onClick={() => setCreateType("movie")}
                  >
                    Movie
                  </button>
                  <button
                    type="button"
                    className={
                      createType === "tv"
                        ? "create-viewing-type-button create-viewing-type-button--active"
                        : "create-viewing-type-button"
                    }
                    onClick={() => setCreateType("tv")}
                  >
                    Show
                  </button>
                </div>
                <button
                  type="button"
                  className="create-viewing-close"
                  onClick={closeCreateModal}
                >
                  ×
                </button>
              </header>

              <div className="create-viewing-body">
                {/* Search */}
                <div className="create-viewing-field">
                  <label className="create-viewing-label">
                    Search for a {createType === "movie" ? "movie" : "show"}
                  </label>
                  <input
                    type="text"
                    className="create-viewing-input"
                    placeholder={
                      createType === "movie"
                        ? "Search for a movie..."
                        : "Search for a show..."
                    }
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedTitle(null);
                    }}
                  />
                  {isSearching && (
                    <div className="create-viewing-search-status">
                      Searching TMDB...
                    </div>
                  )}
                  {searchResults.length > 0 && (
                    <ul className="create-viewing-search-results">
                      {searchResults.map((r) => (
                        <li key={r.id}>
                          <button
                            type="button"
                            className="create-viewing-search-result"
                            onClick={() => handleSelectTitle(r)}
                          >
                            {r.posterUrl && (
                              <img
                                src={r.posterUrl}
                                alt={r.label}
                                className="create-viewing-search-poster"
                              />
                            )}
                            <span>{r.label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {selectedTitle && (
                    <div className="create-viewing-selected">
                      Selected: {selectedTitle.label}
                    </div>
                  )}
                </div>

                {/* Rating */}
                <div className="create-viewing-field">
                  <div className="create-viewing-rating-row">
                    <span className="create-viewing-label">Rating:</span>
                    <div className="create-viewing-stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          className={
                            i < rating
                              ? "viewing-star viewing-star--filled"
                              : "viewing-star"
                          }
                          onClick={() => setRating(i + 1)}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* TV extras */}
                {createType === "tv" && (
                  <div className="create-viewing-row">
                    <div className="create-viewing-field create-viewing-field-half">
                      <label className="create-viewing-label">
                        Season (optional)
                      </label>
                      <input
                        type="number"
                        min={1}
                        className="create-viewing-input"
                        value={seasonNumber}
                        onChange={(e) => setSeasonNumber(e.target.value)}
                      />
                    </div>
                    <div className="create-viewing-field create-viewing-field-half">
                      <label className="create-viewing-label">
                        Episode (optional)
                      </label>
                      <input
                        type="number"
                        min={1}
                        className="create-viewing-input"
                        value={episodeNumber}
                        onChange={(e) => setEpisodeNumber(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Note */}
                <div className="create-viewing-field">
                  <label className="create-viewing-label">
                    Notes (optional)
                  </label>
                  <textarea
                    className="create-viewing-textarea"
                    maxLength={1000}
                    placeholder="What did you think?"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <div className="create-viewing-char-counter">
                    {note.length}/1000
                  </div>
                </div>

                {/* Watched on */}
                <div className="create-viewing-field">
                  <div className="create-viewing-watched-row">
                    <span className="create-viewing-label">Watched on:</span>
                    <input
                      type="date"
                      className="create-viewing-input"
                      value={watchedAt}
                      onChange={(e) => setWatchedAt(e.target.value)}
                    />
                  </div>
                </div>

                {submitError && (
                  <div className="create-viewing-error">{submitError}</div>
                )}
              </div>

              <footer className="create-viewing-footer">
                <button
                  type="button"
                  className="create-viewing-cancel"
                  onClick={closeCreateModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="create-viewing-submit"
                  onClick={handleSubmitViewing}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save viewing"}
                </button>
              </footer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewingsPage;