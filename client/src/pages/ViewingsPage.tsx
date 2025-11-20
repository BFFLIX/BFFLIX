
// src/pages/ViewingsPage.tsx
import type { FC } from "react";
import { useEffect, useState } from "react";
import LeftSidebar from "../components/LeftSidebar";
import TopBar from "../components/TopBar";
import { apiGet, apiPost, apiDelete } from "../lib/api";
import {
  searchTmdbTitles,
  fetchTmdbTitleDetails,
} from "../lib/TMDBService";
import type { TmdbTitleOption } from "../lib/TMDBService";

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
  if (lower === "show" || lower === "tv") return "TV Show";
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

const ViewingsPage: FC = () => {
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

  // Stats for header cards
  const totalViewings = viewings.length;
  const movieCount = viewings.filter(
    (v) => v.type && v.type.toString().toLowerCase() === "movie"
  ).length;
  const showCount = viewings.filter((v) => {
    const t = v.type?.toString().toLowerCase();
    return t === "tv" || t === "show";
  }).length;
  const noteCount = viewings.filter((v) => v.comment && v.comment.trim())
    .length;

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

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(circle_at_top,_#1f1632_0,_#050311_55%,_#020008_100%)] text-slate-50">
      <TopBar />

      <div className="flex flex-1">
        <LeftSidebar />

        <main className="flex-1 overflow-y-auto px-4 pb-10 pt-6 md:px-8 mt-2">
          <section className="mx-auto flex max-w-6xl flex-col gap-6">
            {/* Header + Add button */}
            <div className="flex flex-col items-center justify-center gap-2 text-center">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-500/20 text-xl">
                    <span role="img" aria-label="viewings">
                      🎬
                    </span>
                  </div>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    My Viewings
                  </h1>
                </div>
                <p className="mt-1 text-sm text-slate-400 text-center">
                  Track what you have watched and revisit your own notes instead
                  of generic summaries.
                </p>
              </div>

              <div className="w-full flex justify-end mt-1">
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center justify-center rounded-full bg-pink-500 px-5 py-2 text-sm font-medium text-white shadow-[0_10px_35px_rgba(236,72,153,0.45)] transition hover:bg-pink-400 hover:shadow-[0_12px_40px_rgba(236,72,153,0.6)]"
                >
                  <span className="mr-2 text-lg leading-none">＋</span>
                  Add viewing
                </button>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-900/70 p-4 shadow-lg shadow-black/40 ring-1 ring-white/5">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                  <span role="img" aria-hidden="true">
                    👀
                  </span>
                  Watched
                </div>
                <div className="mt-3 text-2xl font-semibold">
                  {totalViewings}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Total movies and shows you have logged.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900/70 p-4 shadow-lg shadow-black/40 ring-1 ring-white/5">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                  <span role="img" aria-hidden="true">
                    🎬
                  </span>
                  Movies
                </div>
                <div className="mt-3 text-2xl font-semibold">{movieCount}</div>
                <p className="mt-1 text-xs text-slate-500">
                  Feature films you have tracked.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900/70 p-4 shadow-lg shadow-black/40 ring-1 ring-white/5">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                  <span role="img" aria-hidden="true">
                    📺
                  </span>
                  TV shows
                </div>
                <div className="mt-3 text-2xl font-semibold">{showCount}</div>
                <p className="mt-1 text-xs text-slate-500">
                  Series or episodes you have logged.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-900/70 p-4 shadow-lg shadow-black/40 ring-1 ring-white/5">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                  <span role="img" aria-hidden="true">
                    ✍️
                  </span>
                  Notes
                </div>
                <div className="mt-3 text-2xl font-semibold">{noteCount}</div>
                <p className="mt-1 text-xs text-slate-500">
                  Viewings where you left your own thoughts.
                </p>
              </div>
            </div>

            {/* Filters row */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="inline-flex rounded-full bg-slate-900/70 p-1 ring-1 ring-white/5">
                <button
                  type="button"
                  onClick={() => setTypeFilter("all")}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    typeFilter === "all"
                      ? "bg-pink-500 text-white shadow-[0_8px_25px_rgba(236,72,153,0.5)]"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  All ({totalViewings})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("movie")}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    typeFilter === "movie"
                      ? "bg-pink-500 text-white shadow-[0_8px_25px_rgba(236,72,153,0.5)]"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Movies ({movieCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("show")}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    typeFilter === "show"
                      ? "bg-pink-500 text-white shadow-[0_8px_25px_rgba(236,72,153,0.5)]"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Shows ({showCount})
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Sort by</span>
                <select
                  className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-100 shadow-inner shadow-black/60 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
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

            {/* Status messages */}
            {isLoading && (
              <div className="rounded-2xl bg-slate-900/70 p-6 text-sm text-slate-300">
                Loading your viewings…
              </div>
            )}

            {error && !isLoading && (
              <div className="rounded-2xl bg-red-900/40 p-6 text-sm text-red-100">
                {error}
              </div>
            )}

            {deleteError && (
              <div className="rounded-2xl bg-red-900/40 p-4 text-xs text-red-100">
                {deleteError}
              </div>
            )}

            {!isLoading && !error && filtered.length === 0 && (
              <div className="rounded-2xl bg-slate-900/70 p-6 text-sm text-slate-300">
                You have not logged any viewings yet. Create a viewing to start
                tracking what you watch.
              </div>
            )}

            {/* Cards grid */}
            {!isLoading && !error && filtered.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {filtered.map((v) => {
                  const circles = normalizeCircleNames(v.circles);
                  const safeRating =
                    typeof v.rating === "number" && v.rating >= 0
                      ? Math.min(5, Math.max(0, v.rating))
                      : 0;

                  const displayTitle =
                    v.title ||
                    (v.tmdbId ? `TMDB #${v.tmdbId}` : "Untitled viewing");

                  const truncatedComment =
                    v.comment && v.comment.length > 160
                      ? `${v.comment.slice(0, 160)}…`
                      : v.comment || "No notes for this viewing yet.";

                  return (
                    <article
                      key={v._id}
                      className="flex flex-col overflow-hidden rounded-3xl bg-slate-950/80 shadow-xl shadow-black/60 ring-1 ring-white/5 transition hover:-translate-y-1 hover:ring-pink-500/60"
                    >
                      {/* Poster */}
                      <div
                        className="relative cursor-pointer"
                        onClick={() => openDetails(v)}
                      >
                        {v.posterUrl ? (
                          <img
                            src={v.posterUrl}
                            alt={displayTitle}
                            className="h-60 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-60 w-full items-center justify-center bg-slate-900 text-sm text-slate-500">
                            No poster
                          </div>
                        )}

                        <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-100 ring-1 ring-white/15">
                          {formatType(v.type) || "Viewing"}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 flex-col p-4">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <h3 className="text-sm font-semibold leading-snug text-slate-50">
                            {displayTitle}
                          </h3>
                          <span className="whitespace-nowrap text-xs text-slate-400">
                            {formatDate(v.watchedAt)}
                          </span>
                        </div>

                        {circles.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-1">
                            {circles.map((c) => (
                              <span
                                key={c}
                                className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium text-slate-300 ring-1 ring-white/10"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Rating + label */}
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[11px] font-medium text-slate-400">
                            Your rating
                          </span>
                          <div className="flex items-center gap-0.5 text-base">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span
                                key={i}
                                className={
                                  i < safeRating
                                    ? "text-yellow-400"
                                    : "text-slate-600"
                                }
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* User's own note instead of generic summary */}
                        <p className="mb-4 line-clamp-4 text-xs leading-relaxed text-slate-300">
                          {truncatedComment}
                        </p>

                        <div className="mt-auto flex items-center justify-between pt-2">
                          <button
                            type="button"
                            onClick={() => openDetails(v)}
                            className="text-xs font-medium text-pink-400 hover:text-pink-300"
                          >
                            View details
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteViewing(v._id);
                            }}
                            disabled={isDeletingId === v._id}
                            className="text-xs font-medium text-red-400 hover:text-red-300 disabled:cursor-wait disabled:text-red-300/60"
                          >
                            {isDeletingId === v._id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* DETAILS DRAWER */}
      {isDetailsOpen && selectedViewing && (
        <div className="fixed inset-0 z-40 flex items-stretch justify-end bg-black/60">
          <div className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-pink-500/40 bg-slate-950/95 p-6 shadow-2xl shadow-black/80">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-50">
                  {selectedViewing.title ||
                    selectedViewing.comment ||
                    (selectedViewing.tmdbId
                      ? `TMDB #${selectedViewing.tmdbId}`
                      : "Viewing details")}
                </h2>
                {selectedViewing.type && (
                  <div className="mt-1 inline-flex rounded-full bg-slate-900/90 px-3 py-0.5 text-[11px] font-medium text-slate-200 ring-1 ring-white/15">
                    {formatType(selectedViewing.type)}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={closeDetails}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/80 text-lg text-slate-300 hover:bg-slate-800"
              >
                ×
              </button>
            </div>

            {isDetailsLoading ? (
              <div className="text-sm text-slate-300">Loading details…</div>
            ) : detailsError ? (
              <div className="rounded-xl bg-red-900/40 p-4 text-sm text-red-100">
                {detailsError}
              </div>
            ) : (
              <>
                <div className="mb-4 space-y-2 text-sm text-slate-300">
                  <div>
                    <span className="text-xs font-medium text-slate-400">
                      Watched:
                    </span>{" "}
                    {formatDate(selectedViewing.watchedAt)}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400">
                      Rating:
                    </span>
                    <div className="flex items-center gap-0.5 text-base">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={
                            i < (selectedViewing.rating || 0)
                              ? "text-yellow-400"
                              : "text-slate-600"
                          }
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {(selectedViewing.body || selectedViewing.comment) && (
                  <div className="mt-2 rounded-2xl bg-slate-900/80 p-4 ring-1 ring-white/10">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Your notes
                    </div>
                    <p className="text-sm leading-relaxed text-slate-200">
                      {selectedViewing.body || selectedViewing.comment}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* CREATE VIEWING MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-3xl rounded-3xl bg-slate-950/95 p-6 shadow-2xl shadow-black/80 ring-1 ring-pink-500/40">
            <header className="mb-4 flex items-center justify-between gap-4">
              <div className="inline-flex rounded-full bg-slate-900/80 p-1 ring-1 ring-white/10">
                <button
                  type="button"
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    createType === "movie"
                      ? "bg-pink-500 text-white shadow-[0_8px_25px_rgba(236,72,153,0.6)]"
                      : "text-slate-300 hover:text-white"
                  }`}
                  onClick={() => setCreateType("movie")}
                >
                  Movie
                </button>
                <button
                  type="button"
                  className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                    createType === "tv"
                      ? "bg-pink-500 text-white shadow-[0_8px_25px_rgba(236,72,153,0.6)]"
                      : "text-slate-300 hover:text-white"
                  }`}
                  onClick={() => setCreateType("tv")}
                >
                  TV Show
                </button>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/80 text-lg text-slate-300 hover:bg-slate-800"
              >
                ×
              </button>
            </header>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Search column */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Search for a {createType === "movie" ? "movie" : "show"}
                </label>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 shadow-inner shadow-black/70 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                  placeholder={
                    createType === "movie"
                      ? "Search for a movie…"
                      : "Search for a show…"
                  }
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedTitle(null);
                  }}
                />

                {isSearching && (
                  <div className="text-xs text-slate-400">Searching TMDB…</div>
                )}

                {!isSearching && searchResults.length > 0 && (
                  <div className="max-h-60 space-y-1 overflow-y-auto rounded-2xl bg-slate-900/90 p-2 text-sm">
                    {searchResults.map((opt) => (
                      <button
                        key={`${opt.type}-${opt.id}`}
                        type="button"
                        onClick={() => handleSelectTitle(opt)}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-slate-100 hover:bg-slate-800"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">{opt.label}</span>
                        </div>
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                          {opt.type === "tv" ? "TV" : "Movie"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedTitle && (
                  <div className="mt-2 rounded-2xl bg-slate-900/90 p-3 text-xs text-slate-200 ring-1 ring-white/10">
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Selected title
                    </div>
                    <div className="font-medium">{selectedTitle.label}</div>
                  </div>
                )}
              </div>

              {/* Details / notes column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Your rating
                  </label>
                  <div className="mt-1 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setRating(i + 1)}
                        className={
                          i < rating
                            ? "text-xl text-yellow-400"
                            : "text-xl text-slate-600 hover:text-slate-400"
                        }
                      >
                        ★
                      </button>
                    ))}
                    {rating === 0 && (
                      <span className="ml-2 text-[11px] text-slate-500">
                        Optional
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Watched on
                  </label>
                  <input
                    type="date"
                    value={watchedAt}
                    onChange={(e) => setWatchedAt(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-black/70 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                  />
                </div>

                {createType === "tv" && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Season
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={seasonNumber}
                        onChange={(e) => setSeasonNumber(e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-black/70 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Episode
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={episodeNumber}
                        onChange={(e) => setEpisodeNumber(e.target.value)}
                        className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-black/70 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Your notes about this viewing
                  </label>
                  <textarea
                    rows={4}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What did you think? Favorite moments, pacing, vibes, who you watched with…"
                    className="mt-1 w-full resize-none rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 shadow-inner shadow-black/70 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    You must give either a rating or some notes to save a viewing.
                  </p>
                </div>

                {submitError && (
                  <div className="rounded-xl bg-red-900/40 p-3 text-xs text-red-100">
                    {submitError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="rounded-full px-4 py-1.5 text-xs font-medium text-slate-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitViewing}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center rounded-full bg-pink-500 px-5 py-1.5 text-xs font-semibold text-white shadow-[0_8px_25px_rgba(236,72,153,0.6)] transition hover:bg-pink-400 disabled:cursor-wait disabled:bg-pink-500/70"
                  >
                    {isSubmitting ? "Saving…" : "Save viewing"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewingsPage;
