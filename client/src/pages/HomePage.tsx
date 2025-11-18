
// src/pages/HomePage.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost, apiDelete } from "../lib/api";
import "../styles/HomePage.css";

// ----------------- Types -----------------

type Circle = {
  _id: string;
  name: string;
  memberCount: number;
};

type ServiceTag =
  | "Netflix"
  | "Hulu"
  | "Prime Video"
  | "Disney+"
  | "Max"
  | "Apple TV+";

type FeedPost = {
  _id: string;
  authorId?: string;
  authorName: string;
  authorAvatarUrl?: string;
  circleNames: string[];
  createdAt: string;
  title: string;
  year?: number;
  type: "Movie" | "Show";
  mediaType?: "movie" | "tv";
  tmdbId?: string;
  rating: number;
  body: string;
  services: string[];
  likeCount: number;
  commentCount: number;
  likedByMe?: boolean;
  imageUrl?: string;
};

type FeedResponse = {
  items: FeedPost[];
  nextCursor?: string | null;
};

type FeedComment = {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
};

type AiSuggestion = {
  id: string;
  text: string;
};

// A loose shape for whatever the /circles endpoint returns.
type RawCircleLike = {
  _id?: string;
  id?: string;
  circleId?: string;
  name?: string;
  memberCount?: number;
  membersCount?: number;
  circle?: RawCircleLike;
  memberships?: RawCircleLike[];
  circles?: RawCircleLike[];
  items?: RawCircleLike[];
  data?: RawCircleLike[];
  [key: string]: any;
};

const normalizeCircles = (
  payload: RawCircleLike | RawCircleLike[] | null | undefined
): Circle[] => {
  if (!payload) return [];

  let list: RawCircleLike[] = [];

  if (Array.isArray(payload)) {
    list = payload;
  } else if (Array.isArray(payload.items)) {
    list = payload.items;
  } else if (Array.isArray(payload.memberships)) {
    list = payload.memberships;
  } else if (Array.isArray(payload.circles)) {
    list = payload.circles;
  } else if (Array.isArray(payload.data)) {
    list = payload.data;
  } else {
    list = [payload];
  }

  const seen = new Set<string>();
  const result: Circle[] = [];

  for (const entry of list) {
    const base = (entry.circle as RawCircleLike) || entry;

    const id =
      (base._id as string | undefined) ||
      (base.id as string | undefined) ||
      (base.circleId as string | undefined);

    if (!id || seen.has(id)) continue;
    seen.add(id);

    result.push({
      _id: id,
      name: (base.name as string | undefined) || "Untitled circle",
      memberCount:
        typeof base.memberCount === "number"
          ? base.memberCount
          : typeof base.membersCount === "number"
          ? base.membersCount
          : 0,
    });
  }

  return result;
};

// Normalize whatever the feed endpoint returns into the stricter FeedPost shape
const normalizeFeedItems = (
  items: any[],
  circlesLookup: Map<string, string>
): FeedPost[] => {
  return (items || []).map((raw, idx) => {
    const id =
      (raw && (raw.id || raw._id || raw.canonicalId)) ||
      `tmp-${idx}-${Date.now()}`;

    const circleIds: string[] = Array.isArray(raw?.circles)
      ? raw.circles.map((c: any) => String(c))
      : Array.isArray(raw?.circleIds)
      ? raw.circleIds.map((c: any) => String(c))
      : [];

    const circleNames =
      Array.isArray(raw?.circleNames) && raw.circleNames.length
        ? raw.circleNames
        : circleIds
            .map((cid) => circlesLookup.get(cid))
            .filter((n): n is string => Boolean(n));

    const body =
      (typeof raw?.body === "string" && raw.body) ||
      (typeof raw?.comment === "string" && raw.comment) ||
      "";

    const services: string[] = Array.isArray(raw?.services)
      ? raw.services
      : Array.isArray(raw?.playableOnMyServices)
      ? raw.playableOnMyServices
      : Array.isArray(raw?.availableOn)
      ? raw.availableOn
      : [];

    const createdAt =
      typeof raw?.createdAt === "string"
        ? raw.createdAt
        : typeof raw?.createdAt === "number"
        ? new Date(raw.createdAt).toISOString()
        : new Date().toISOString();

    return {
      _id: String(id),
      authorId: raw?.authorId ? String(raw.authorId) : undefined,
      authorName:
        (raw?.authorName as string) ||
        (raw?.author as string) ||
        (raw?.authorId as string) ||
        "Someone",
      authorAvatarUrl: raw?.authorAvatarUrl as string | undefined,
      circleNames,
      createdAt,
      title:
        (raw?.title as string) ||
        (raw?.name as string) ||
        (raw?.tmdbTitle as string) ||
        "Untitled",
      year:
        typeof raw?.year === "number"
          ? raw.year
          : raw?.watchedAt
          ? Number(String(raw.watchedAt).slice(0, 4))
          : undefined,
      type:
        raw?.type === "tv" || raw?.type === "tv_show" || raw?.type === "Show"
          ? "Show"
          : "Movie",
      mediaType:
        raw?.type === "tv" || raw?.type === "tv_show" || raw?.type === "Show"
          ? "tv"
          : "movie",
      tmdbId: raw?.tmdbId ? String(raw.tmdbId) : undefined,
      rating: typeof raw?.rating === "number" ? raw.rating : 0,
      body,
      services,
      likeCount: typeof raw?.likeCount === "number" ? raw.likeCount : 0,
      commentCount:
        typeof raw?.commentCount === "number" ? raw.commentCount : 0,
      likedByMe: !!raw?.likedByMe,
      imageUrl:
        (raw?.imageUrl as string | undefined) ||
        (raw?.posterUrl as string | undefined),
    };
  });
};

// RecentViewing type for recently watched
type RecentViewing = {
  id: string;
  title: string;
  rating: number;
  posterUrl?: string;
};

// TMDB search result (simplified)
type TmdbSearchResult = {
  id: number;
  media_type: string;
  title?: string;
  name?: string;
  poster_path?: string;
  release_date?: string;
  first_air_date?: string;
};

type SelectedTitle = {
  id: number;
  label: string;
};

// ----------------- Static AI suggestions -----------------

const STATIC_AI_SUGGESTIONS: AiSuggestion[] = [
  {
    id: "based-on-history",
    text: "Recommend something based on my past viewings",
  },
  {
    id: "romcom-action",
    text: "I want a romantic comedy with some action",
  },
  {
    id: "comfort-binge",
    text: "Give me a cozy comfort show to binge",
  },
  {
    id: "friends-night",
    text: "What should I watch with friends tonight?",
  },
  {
    id: "hidden-gems",
    text: "Show me some hidden gems I may have missed",
  },
];

// ----------------- Component -----------------

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"all" | "circles" | "mine">("all");
  const [activeService, setActiveService] = useState<
    ServiceTag | "All services"
  >("All services");
  const [sortOrder, setSortOrder] = useState<"latest" | "smart">("latest");

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [aiSuggestions] = useState<AiSuggestion[]>(STATIC_AI_SUGGESTIONS);
  const [recentViewings, setRecentViewings] = useState<RecentViewing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    {}
  );
  const [commentSubmitting, setCommentSubmitting] = useState<
    Record<string, boolean>
  >({});
  const [viewingSaving, setViewingSaving] = useState<Record<string, boolean>>(
    {}
  );
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, FeedComment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<
    Record<string, boolean>
  >({});

  // Create Post state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<"movie" | "tv">("movie");

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SelectedTitle[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<SelectedTitle | null>(
    null
  );

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [watchedAt, setWatchedAt] = useState(""); // YYYY-MM-DD from <input type="date">

  const [seasonNumber, setSeasonNumber] = useState("");
  const [episodeNumber, setEpisodeNumber] = useState("");

  const [selectedCircleIds, setSelectedCircleIds] = useState<string[]>([]);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  // ----------------- Data loading -----------------

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [feedResult, circlesResult] = await Promise.allSettled([
        apiGet<FeedResponse>(
          `/feed?scope=${encodeURIComponent(
            activeTab
          )}&sort=${encodeURIComponent(sortOrder)}${
            activeService === "All services"
              ? ""
              : `&service=${encodeURIComponent(activeService)}`
          }`
        ),
        apiGet<any>("/circles"),
      ]);

      let refreshedCircles: Circle[] = [];

      if (circlesResult.status === "fulfilled") {
        refreshedCircles = normalizeCircles(circlesResult.value);
        setCircles(refreshedCircles);
      } else {
        console.error("Circles load error", circlesResult.reason);
        setCircles([]);
      }

      if (feedResult.status === "fulfilled") {
        const feedData = feedResult.value;
        const circleMap = new Map(
          refreshedCircles.map(
            (c) => [c._id, c.name] as [string, string]
          )
        );
        const normalized = normalizeFeedItems(
          Array.isArray(feedData?.items) ? feedData.items : [],
          circleMap
        );
        setPosts(normalized);
      } else {
        const err = feedResult.reason;
        console.error("Feed load error", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load your BFFlix feed. Please try again."
        );
        setPosts([]);
      }
    } finally {
      setIsLoading(false);
    }

    // Soft-fail: recent viewings (OK if 404 in prod)
    try {
      const recentData = await apiGet<RecentViewing[]>("/viewings/recent");
      setRecentViewings(recentData);
    } catch (err) {
      console.warn("Failed to load recent viewings (non-fatal)", err);
      setRecentViewings([]);
    }
  }, [activeTab, activeService, sortOrder]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Load current user id once for author-only actions
  useEffect(() => {
    (async () => {
      try {
        const me = await apiGet<any>("/me");
        if (me?.id || me?._id) {
          setCurrentUserId(String(me.id || me._id));
        }
        if (me?.name) {
          setCurrentUserName(me.name as string);
        }
      } catch (err) {
        console.warn("Failed to load /me for current user id", err);
      }
    })();
  }, []);

  // ----------------- Helpers -----------------

  const formatTimeAgo = (iso: string) => {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const servicesList: (ServiceTag | "All services")[] = [
    "All services",
    "Netflix",
    "Hulu",
    "Prime Video",
    "Disney+",
    "Max",
    "Apple TV+",
  ];

  const openCreateModal = () => {
    setIsCreateOpen(true);
    setCreateType("movie");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedTitle(null);
    setRating(0);
    setComment("");
    setWatchedAt("");
    setSeasonNumber("");
    setEpisodeNumber("");
    setSelectedCircleIds([]);
    setPostError(null);
  };

  const closeCreateModal = () => {
    setIsCreateOpen(false);
  };

  const toggleCircleSelection = (id: string) => {
    setSelectedCircleIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleToggleLike = async (postId: string, liked?: boolean) => {
    try {
      if (liked) {
        await apiDelete(`/posts/${postId}/like`);
      } else {
        await apiPost(`/posts/${postId}/like`);
      }

      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? {
                ...p,
                likedByMe: liked ? false : true,
                likeCount: (p.likeCount || 0) + (liked ? -1 : 1),
              }
            : p
        )
      );
    } catch (err) {
      console.error("Like toggle failed", err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const confirmed = window.confirm(
        "Are you sure you want to delete this post?"
      );
      if (!confirmed) return;
      await apiDelete(`/posts/${postId}`);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      setComments((prev) => {
        const clone = { ...prev };
        delete clone[postId];
        return clone;
      });
      setOpenComments((prev) => {
        const clone = { ...prev };
        delete clone[postId];
        return clone;
      });
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleAddViewing = async (post: FeedPost) => {
    if (!post.tmdbId) return;
    const kind: "movie" | "tv" = post.mediaType === "tv" ? "tv" : "movie";
    try {
      setViewingSaving((prev) => ({ ...prev, [post._id]: true }));
      await apiPost("/viewings", {
        type: kind,
        tmdbId: post.tmdbId,
        rating: post.rating || undefined,
        comment: post.body || undefined,
        watchedAt: post.createdAt,
      });
    } catch (err) {
      console.error("Add viewing failed", err);
    } finally {
      setViewingSaving((prev) => ({ ...prev, [post._id]: false }));
    }
  };

  const fetchComments = async (postId: string) => {
    try {
      setCommentsLoading((prev) => ({ ...prev, [postId]: true }));
      const resp = await apiGet<{ items: any[] } | any[]>(
        `/posts/${postId}/comments?limit=50`
      );
      const items = Array.isArray(resp)
        ? resp
        : Array.isArray(resp?.items)
        ? resp.items
        : [];
      const normalized: FeedComment[] = items.map((c: any, idx) => ({
        id: String(c.id || c._id || `c-${idx}`),
        userId: String(c.userId || c.user || "anon"),
        text: String(c.text || ""),
        createdAt:
          typeof c.createdAt === "string"
            ? c.createdAt
            : c.createdAt
            ? new Date(c.createdAt).toISOString()
            : new Date().toISOString(),
      }));
      setComments((prev) => ({ ...prev, [postId]: normalized }));
    } catch (err) {
      console.error("Load comments failed", err);
    } finally {
      setCommentsLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleToggleComments = async (postId: string) => {
    const next = !openComments[postId];
    setOpenComments((prev) => ({ ...prev, [postId]: next }));
    if (next && !comments[postId]) {
      await fetchComments(postId);
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentDrafts[postId]?.trim() || "";
    if (!text) return;
    try {
      setCommentSubmitting((prev) => ({ ...prev, [postId]: true }));
      const resp = await apiPost<any>(`/posts/${postId}/comments`, { text });
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? { ...p, commentCount: (p.commentCount || 0) + 1 }
            : p
        )
      );
      const created: FeedComment = {
        id: String(resp?.id || `c-${Date.now()}`),
        userId: currentUserId || "me",
        text,
        createdAt: resp?.createdAt || new Date().toISOString(),
      };
      setComments((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), created],
      }));
      setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    } catch (err) {
      console.error("Comment failed", err);
    } finally {
      setCommentSubmitting((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const mapTmdbResultToTitle = (r: TmdbSearchResult): SelectedTitle => {
    const name = r.title || r.name || "Untitled";
    const yearSource = r.release_date || r.first_air_date || "";
    const year = yearSource ? yearSource.slice(0, 4) : "";
    const label = year ? `${name} (${year})` : name;
    return { id: r.id, label };
  };

  // TMDB search effect (debounced)
  useEffect(() => {
    if (!isCreateOpen) return;
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        setIsSearching(true);
        setPostError(null);

        const trimmed = searchQuery.trim();
        const data = await apiGet<any>(
          `/tmdb/search?query=${encodeURIComponent(trimmed)}&page=1`
        );

        const results: TmdbSearchResult[] = data?.results || [];
        const mapped = results
          .filter(
            (r) =>
              r.media_type === "movie" ||
              r.media_type === "tv" ||
              r.media_type === "tv_show"
          )
          .slice(0, 8)
          .map(mapTmdbResultToTitle);

        setSearchResults(mapped);
      } catch (err) {
        console.error("TMDB search error", err);
        setPostError("Failed to search TMDB. Please try again.");
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(handle);
  }, [searchQuery, isCreateOpen]);

  const handleSelectTitle = (title: SelectedTitle) => {
    setSelectedTitle(title);
    setSearchQuery(title.label);
    setSearchResults([]);
  };

  const handleSubmitPost = async () => {
    if (!selectedTitle) {
      setPostError("Please search and select a movie or show.");
      return;
    }
    if (!selectedCircleIds.length) {
      setPostError("Please select at least one circle.");
      return;
    }
    if (!rating && !comment.trim()) {
      setPostError("Please add a rating or a short comment.");
      return;
    }
    if (createType === "tv" && episodeNumber && !seasonNumber) {
      setPostError("Season number is required when an episode is specified.");
      return;
    }

    try {
      setIsSubmittingPost(true);
      setPostError(null);

      const payload: Record<string, any> = {
        type: createType === "movie" ? "movie" : "tv",
        tmdbId: String(selectedTitle.id),
        circles: selectedCircleIds,
      };

      if (rating) payload.rating = rating;
      if (comment.trim()) payload.comment = comment.trim();
      if (watchedAt) {
        payload.watchedAt = watchedAt;
      }
      if (createType === "tv" && seasonNumber) {
        payload.seasonNumber = Number(seasonNumber);
      }
      if (createType === "tv" && episodeNumber) {
        payload.episodeNumber = Number(episodeNumber);
      }

      await apiPost("/posts", payload);

      closeCreateModal();
      await fetchAll();
    } catch (err) {
      console.error("Create post error", err);
      if (err instanceof Error) {
        setPostError(err.message);
      } else {
        setPostError("Failed to create post. Please try again.");
      }
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // ----------------- Helpers end -----------------

  // ----------------- Logout handler -----------------
  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    navigate("/login");
  };

  // ----------------- Render -----------------

  return (
    <div className="app-shell">
      <div className="home-topbar">
        <h1 className="home-topbar-title">Home</h1>
        <div className="home-topbar-right">
          <button
            type="button"
            className="profile-chip"
            onClick={() => navigate("/profile")}
          >
            <span className="profile-chip-avatar">👤</span>
            <span className="profile-chip-name">
              {currentUserName || "Profile"}
            </span>
          </button>
        </div>
      </div>

      <div className="app-main-layout">
        {/* Left sidebar */}
        <aside className="app-sidebar">
          <nav className="app-sidebar-nav">
            <button className="app-nav-item app-nav-item--active">
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
              className="app-nav-item"
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
          </nav>
          <button
            className="app-logout-button"
            type="button"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </aside>

        {/* Center feed */}
        <main className="app-feed">
          <header className="feed-header">
            <div className="feed-top-row">
              <div className="feed-tabs">
                <button
                  className={
                    activeTab === "all"
                      ? "feed-tab feed-tab--active"
                      : "feed-tab"
                  }
                  onClick={() => setActiveTab("all")}
                >
                  All posts
                </button>
                <button
                  className={
                    activeTab === "circles"
                      ? "feed-tab feed-tab--active"
                      : "feed-tab"
                  }
                  onClick={() => setActiveTab("circles")}
                >
                  My circles
                </button>
                <button
                  className={
                    activeTab === "mine"
                      ? "feed-tab feed-tab--active"
                      : "feed-tab"
                  }
                  onClick={() => setActiveTab("mine")}
                >
                  My posts
                </button>
              </div>

              <button
                className="feed-new-post-button"
                type="button"
                onClick={openCreateModal}
              >
                + Post
              </button>
            </div>

            <div className="feed-filters-row">
              <div className="feed-services">
                {servicesList.map((s) => (
                  <button
                    key={s}
                    className={
                      activeService === s
                        ? "feed-service-chip feed-service-chip--active"
                        : "feed-service-chip"
                    }
                    onClick={() => setActiveService(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="feed-sort">
                <select
                  className="feed-sort-select"
                  value={sortOrder}
                  onChange={(e) =>
                    setSortOrder(e.target.value as "latest" | "smart")
                  }
                >
                  <option value="latest">Newest</option>
                  <option value="smart">Top picks</option>
                </select>
              </div>
            </div>
          </header>

          {/* Create post modal */}
          {isCreateOpen && (
            <div className="create-post-backdrop">
              <div className="create-post-card">
                <header className="create-post-header">
                  <div className="create-post-type-toggle">
                    <button
                      type="button"
                      className={
                        createType === "movie"
                          ? "create-post-type-button create-post-type-button--active"
                          : "create-post-type-button"
                      }
                      onClick={() => setCreateType("movie")}
                    >
                      Movie
                    </button>
                    <button
                      type="button"
                      className={
                        createType === "tv"
                          ? "create-post-type-button create-post-type-button--active"
                          : "create-post-type-button"
                      }
                      onClick={() => setCreateType("tv")}
                    >
                      Show
                    </button>
                  </div>
                  <button
                    type="button"
                    className="create-post-close"
                    onClick={closeCreateModal}
                  >
                    ×
                  </button>
                </header>

                <div className="create-post-body">
                  <div className="create-post-field">
                    <label className="create-post-label">
                      Search for a {createType === "movie" ? "movie" : "show"}
                    </label>
                    <input
                      type="text"
                      className="create-post-input"
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
                      <div className="create-post-search-status">
                        Searching TMDB...
                      </div>
                    )}
                    {searchResults.length > 0 && (
                      <ul className="create-post-search-results">
                        {searchResults.map((r) => (
                          <li key={r.id}>
                            <button
                              type="button"
                              className="create-post-search-result"
                              onClick={() => handleSelectTitle(r)}
                            >
                              {r.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {selectedTitle && (
                      <div className="create-post-selected">
                        Selected: {selectedTitle.label}
                      </div>
                    )}
                  </div>

                  <div className="create-post-field">
                    <div className="create-post-rating-row">
                      <span className="create-post-label">Rating:</span>
                      <div className="create-post-stars">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            className={
                              i < rating
                                ? "feed-star feed-star--filled"
                                : "feed-star"
                            }
                            onClick={() => setRating(i + 1)}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {createType === "tv" && (
                    <div className="create-post-row">
                      <div className="create-post-field create-post-field-half">
                        <label className="create-post-label">
                          Season (optional)
                        </label>
                        <input
                          type="number"
                          min={1}
                          className="create-post-input"
                          value={seasonNumber}
                          onChange={(e) => setSeasonNumber(e.target.value)}
                        />
                      </div>
                      <div className="create-post-field create-post-field-half">
                        <label className="create-post-label">
                          Episode (optional)
                        </label>
                        <input
                          type="number"
                          min={1}
                          className="create-post-input"
                          value={episodeNumber}
                          onChange={(e) => setEpisodeNumber(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="create-post-field">
                    <label className="create-post-label">
                      Share your thoughts (optional)
                    </label>
                    <textarea
                      className="create-post-textarea"
                      maxLength={1000}
                      placeholder="What did you think?"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <div className="create-post-char-counter">
                      {comment.length}/1000
                    </div>
                  </div>

                  <div className="create-post-field">
                    <div className="create-post-watched-row">
                      <span className="create-post-label">Watched on:</span>
                      <input
                        type="date"
                        className="create-post-input"
                        value={watchedAt}
                        onChange={(e) => setWatchedAt(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="create-post-field">
                    <div className="create-post-circles-row">
                      <span className="create-post-label">
                        Post to circles:
                      </span>
                      <div className="create-post-circles">
                        {circles.map((circle) => (
                          <button
                            key={circle._id}
                            type="button"
                            className={
                              selectedCircleIds.includes(circle._id)
                                ? "create-post-circle create-post-circle--active"
                                : "create-post-circle"
                            }
                            onClick={() => toggleCircleSelection(circle._id)}
                          >
                            {circle.name}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="create-post-circle create-post-circle--add"
                          onClick={() => {
                            closeCreateModal();
                            navigate("/circles");
                          }}
                        >
                          +
                        </button>
                      </div>
                      {circles.length === 0 && (
                        <p className="create-post-circles-empty">
                          You are not in any circles yet. Tap + to create or
                          join one.
                        </p>
                      )}
                    </div>
                  </div>

                  {postError && (
                    <div className="create-post-error">{postError}</div>
                  )}
                </div>

                <footer className="create-post-footer">
                  <button
                    type="button"
                    className="create-post-cancel"
                    onClick={closeCreateModal}
                    disabled={isSubmittingPost}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="create-post-submit"
                    onClick={handleSubmitPost}
                    disabled={isSubmittingPost}
                  >
                    {isSubmittingPost ? "Posting..." : "Post"}
                  </button>
                </footer>
              </div>
            </div>
          )}

          <section className="feed-list">
            {isLoading && (
              <div className="feed-loading">Loading your feed...</div>
            )}

            {error && !isLoading && (
              <div className="feed-error">{error}</div>
            )}

            {!isLoading && !error && posts.length === 0 && (
              <div className="feed-empty">
                Make your first post or join your first circle to start your
                BFFlix feed.
              </div>
            )}

            {!isLoading &&
              !error &&
              posts.map((post) => (
                <article key={post._id} className="feed-card">
                  <header className="feed-card-header">
                    <div className="feed-card-author">
                      <div className="feed-card-avatar">
                        {post.authorAvatarUrl ? (
                          <img
                            src={post.authorAvatarUrl}
                            alt={post.authorName}
                          />
                        ) : (
                          <span>
                            {post.authorName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="feed-card-author-meta">
                        <div className="feed-card-author-name">
                          {post.authorName}
                        </div>
                        <div className="feed-card-subtitle">
                          Posted in: {post.circleNames.join(", ")}
                        </div>
                      </div>
                    </div>
                    <div className="feed-card-timestamp">
                      {formatTimeAgo(post.createdAt)}
                    </div>
                  </header>

                  <div className="feed-card-body">
                    {post.imageUrl && (
                      <div className="feed-card-poster">
                        <img src={post.imageUrl} alt={post.title} />
                      </div>
                    )}

                    <div className="feed-card-main">
                      <div className="feed-card-title-row">
                        <h2 className="feed-card-title">
                          {post.title}
                          {post.year ? ` (${post.year})` : ""}
                        </h2>
                        <span className="feed-card-type-pill">
                          {post.type === "Movie" ? "Movie" : "Show"}
                        </span>
                      </div>

                      <div className="feed-card-rating-row">
                        <div
                          className="feed-card-stars"
                          aria-label={`Rating ${post.rating} out of 5`}
                        >
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span
                              key={i}
                              className={
                                i < post.rating
                                  ? "feed-star feed-star--filled"
                                  : "feed-star"
                              }
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>

                      <p className="feed-card-text">{post.body}</p>

                      <div className="feed-card-services">
                        {post.services.map((service) => (
                          <span key={service} className="feed-service-pill">
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <footer className="feed-card-footer">
                    <button
                      className="feed-footer-action"
                      type="button"
                      onClick={() =>
                        handleToggleLike(post._id, post.likedByMe)
                      }
                    >
                      <span>{post.likedByMe ? "❤️" : "🤍"}</span>
                      <span>{post.likeCount}</span>
                    </button>
                    <button
                      className="feed-footer-action"
                      type="button"
                      onClick={() => handleToggleComments(post._id)}
                    >
                      <span>💬</span>
                      <span>{post.commentCount}</span>
                    </button>
                    <button
                      className="feed-footer-action"
                      type="button"
                      onClick={() => handleAddViewing(post)}
                      disabled={!post.tmdbId || viewingSaving[post._id]}
                    >
                      <span>🎬</span>
                      <span>
                        {viewingSaving[post._id]
                          ? "Saving..."
                          : "Add to viewings"}
                      </span>
                    </button>
                    <button className="feed-footer-action feed-footer-action--right">
                      🔖
                    </button>
                    {post.authorId &&
                      currentUserId &&
                      post.authorId === currentUserId && (
                        <button
                          className="feed-footer-action feed-footer-action--right"
                          type="button"
                          onClick={() => handleDeletePost(post._id)}
                        >
                          🗑
                        </button>
                      )}
                  </footer>

                  {openComments[post._id] && (
                    <div className="feed-comment-box">
                      <div className="feed-comment-list">
                        {commentsLoading[post._id] && (
                          <div className="feed-comment-loading">
                            Loading comments...
                          </div>
                        )}
                        {(comments[post._id] || []).map((c) => (
                          <div key={c.id} className="feed-comment-item">
                            <div className="feed-comment-meta">
                              <span className="feed-comment-author">
                                {currentUserId && c.userId === currentUserId
                                  ? "You"
                                  : c.userId}
                              </span>
                              <span className="feed-comment-time">
                                {new Date(c.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="feed-comment-text">{c.text}</div>
                          </div>
                        ))}
                        {!commentsLoading[post._id] &&
                          (!comments[post._id] ||
                            comments[post._id].length === 0) && (
                            <div className="feed-comment-empty">
                              No comments yet. Be the first!
                            </div>
                          )}
                      </div>
                      <textarea
                        className="feed-comment-input"
                        placeholder="Add a comment..."
                        value={commentDrafts[post._id] || ""}
                        onChange={(e) =>
                          setCommentDrafts((prev) => ({
                            ...prev,
                            [post._id]: e.target.value,
                          }))
                        }
                        rows={2}
                      />
                      <button
                        type="button"
                        className="feed-comment-submit"
                        onClick={() => handleAddComment(post._id)}
                        disabled={commentSubmitting[post._id]}
                      >
                        {commentSubmitting[post._id]
                          ? "Posting..."
                          : "Post comment"}
                      </button>
                    </div>
                  )}
                </article>
              ))}
          </section>
        </main>

        {/* Right rail */}
        <aside className="app-right-rail">
          <section className="rail-card">
            <header className="rail-card-header">
              <h2 className="rail-card-title">Your Circles</h2>
            </header>
            <div className="rail-circles-list">
              {circles.map((circle) => (
                <button key={circle._id} className="rail-circle-item">
                  <div className="rail-circle-name">{circle.name}</div>
                  <div className="rail-circle-meta">
                    {circle.memberCount} members
                  </div>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="rail-view-all"
              onClick={() => navigate("/circles")}
            >
              View all circles
            </button>
          </section>

          <section className="rail-card rail-card-ai">
            <header className="rail-card-header">
              <h2 className="rail-card-title">
                <span className="rail-ai-icon">AI</span>
                AI Recommendations
              </h2>
            </header>
            <p className="rail-ai-text">
              Ask the BFFlix AI for movie and TV recommendations tailored to
              your taste.
            </p>
            <div className="rail-ai-chip-list">
              {aiSuggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="rail-ai-chip"
                  onClick={() =>
                    navigate("/ai", { state: { initialPrompt: s.text } })
                  }
                >
                  {s.text}
                </button>
              ))}
            </div>
            <button
              className="rail-ai-button"
              type="button"
              onClick={() => navigate("/ai")}
            >
              Open AI Assistant
            </button>
          </section>

          <section className="rail-card">
            <header className="rail-card-header">
              <h2 className="rail-card-title">Recently watched</h2>
            </header>
            {recentViewings.length === 0 ? (
              <p className="rail-empty-text">
                Start logging what you watch to see it here.
              </p>
            ) : (
              <ul className="rail-recent-viewings-list">
                {recentViewings.map((v) => (
                  <li key={v.id} className="rail-recent-viewing-item">
                    {v.posterUrl && (
                      <div className="rail-recent-poster">
                        <img src={v.posterUrl} alt={v.title} />
                      </div>
                    )}
                    <div className="rail-recent-content">
                      <div className="rail-recent-title">{v.title}</div>
                      <div className="rail-recent-rating">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={
                              i < v.rating
                                ? "feed-star feed-star--filled"
                                : "feed-star"
                            }
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <button
            className="rail-floating-ai-button"
            type="button"
            onClick={() => navigate("/ai")}
          >
            <span className="rail-floating-ai-label">AI</span>
          </button>
        </aside>
      </div>
    </div>
  );
};

export default HomePage;
