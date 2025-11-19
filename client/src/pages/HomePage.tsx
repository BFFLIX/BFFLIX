
// src/pages/HomePage.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { apiGet, apiPost, apiDelete } from "../lib/api";
import bfflixLogo from "../assets/bfflix-logo.svg";


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
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [aiSuggestions] = useState<AiSuggestion[]>(STATIC_AI_SUGGESTIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    {}
  );
  const [commentSubmitting, setCommentSubmitting] = useState<
    Record<string, boolean>
  >({});
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
        const next = (feedData as FeedResponse)?.nextCursor ?? null;
        setNextCursor(next);
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
  }, [activeTab, activeService, sortOrder]);

  // Pagination: load more handler
  const handleLoadMore = async () => {
    if (!nextCursor) return;
    try {
      setIsLoadingMore(true);
      const feedData = await apiGet<FeedResponse>(
        `/feed?scope=${encodeURIComponent(activeTab)}&sort=${encodeURIComponent(sortOrder)}${
          activeService === "All services"
            ? ""
            : `&service=${encodeURIComponent(activeService)}`
        }&cursor=${encodeURIComponent(nextCursor)}`
      );

      const circleMap = new Map(circles.map((c) => [c._id, c.name] as [string, string]));
      const moreItems = normalizeFeedItems(
        Array.isArray(feedData?.items) ? feedData.items : [],
        circleMap
      );

      setPosts((prev) => [...prev, ...moreItems]);
      setNextCursor(feedData.nextCursor ?? null);
    } catch (err) {
      console.error("Load more feed error", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

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

  const handleDeleteComment = async (postId: string, commentId: string) => {
    const confirmed = window.confirm("Delete this comment?");
    if (!confirmed) return;
    try {
      await apiDelete(`/posts/${postId}/comments/${commentId}`);
      setComments((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).filter((c) => c.id !== commentId),
      }));
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? { ...p, commentCount: Math.max(0, (p.commentCount || 0) - 1) }
            : p
        )
      );
    } catch (err) {
      console.error("Delete comment failed", err);
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
    <div className="min-h-screen bg-gradient-to-br from-[#05010f] via-[#080016] to-black text-slate-100 flex flex-col">
      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/40 backdrop-blur">
        <div className="flex items-center gap-3">
          <img
            src={bfflixLogo}
            alt="BFFlix"
            className="h-10 w-auto drop-shadow-[0_0_18px_rgba(255,0,122,0.6)]"
          />
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition"
          onClick={() => navigate("/profile")}
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-red-500 text-sm">
            👤
          </span>
          <span className="font-medium text-sm">{currentUserName || "Profile"}</span>
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left sidebar */}
        <aside className="w-56 flex-shrink-0 bg-black/40 border-r border-white/5 flex flex-col gap-4 py-6 sticky top-0 h-screen">
          <nav className="flex flex-col gap-2 px-4">
            <button
              className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-red-500 text-white font-semibold shadow-[0_12px_30px_rgba(0,0,0,0.7)]"
              disabled
            >
              <span>🏠</span>
              <span>Home</span>
            </button>
            <button
              className="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-white/5 text-slate-200"
              type="button"
              onClick={() => navigate("/circles")}
            >
              <span>👥</span>
              <span>Circles</span>
            </button>
            <button
              className="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-white/5 text-slate-200"
              type="button"
              onClick={() => navigate("/viewings")}
            >
              <span>🎬</span>
              <span>Viewings</span>
            </button>
            <button
              className="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-white/5 text-slate-200"
              type="button"
              onClick={() => navigate("/ai")}
            >
              <span>✨</span>
              <span>AI Assistant</span>
            </button>
          </nav>
          <div className="mt-[120px] px-4">
            <button
              className="w-full py-2 rounded-xl bg-red-600/90 text-white font-semibold hover:bg-red-500 shadow-[0_10px_25px_rgba(0,0,0,0.8)]"
              type="button"
              onClick={handleLogout}
            >
              Log Out
            </button>
          </div>
        </aside>

        {/* Center feed */}
        <main className="flex-1 min-w-0 px-0 md:px-8 py-8">
          <header>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <button
                  className={`px-4 py-2 rounded-t font-semibold border-b-2 ${
                    activeTab === "all"
                      ? "border-pink-500 text-pink-300 bg-pink-500/10"
                      : "border-transparent text-slate-300 hover:bg-white/5"
                  }`}
                  onClick={() => setActiveTab("all")}
                >
                  All posts
                </button>
                <button
                  className={`px-4 py-2 rounded-t font-semibold border-b-2 ${
                    activeTab === "circles"
                      ? "border-pink-500 text-pink-300 bg-pink-500/10"
                      : "border-transparent text-slate-300 hover:bg-white/5"
                  }`}
                  onClick={() => setActiveTab("circles")}
                >
                  My circles
                </button>
                <button
                  className={`px-4 py-2 rounded-t font-semibold border-b-2 ${
                    activeTab === "mine"
                      ? "border-pink-500 text-pink-300 bg-pink-500/10"
                      : "border-transparent text-slate-300 hover:bg-white/5"
                  }`}
                  onClick={() => setActiveTab("mine")}
                >
                  My posts
                </button>
              </div>
              <button
                className="px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold shadow-[0_10px_30px_rgba(0,0,0,0.8)] hover:brightness-110 transition"
                type="button"
                onClick={openCreateModal}
              >
                + Post
              </button>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-6">
              <div className="flex flex-wrap gap-2">
                {servicesList.map((s) => (
                  <button
                    key={s}
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      activeService === s
                        ? "bg-pink-600/80 border-pink-400 text-white shadow-[0_8px_20px_rgba(0,0,0,0.8)]"
                        : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                    }`}
                    onClick={() => setActiveService(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Sort by</span>
                <select
                  className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-100 shadow-inner shadow-black/60 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                  value={sortOrder}
                  onChange={(e) =>
                    setSortOrder(e.target.value as "latest" | "smart")
                  }
                >
                  <option value="latest">Newest</option>
                  <option value="smart">Top Picks</option>
                </select>
              </div>
            </div>
          </header>

          {/* Create post modal */}
          {isCreateOpen && (
            <div className="fixed inset-0 z-30 bg-black bg-opacity-40 flex items-center justify-center">
              <div className="bg-[#070211] text-slate-100 rounded-2xl shadow-[0_24px_70px_rgba(0,0,0,0.95)] border border-white/10 w-full max-w-lg mx-2">
                <header className="flex items-center justify-between px-6 py-4 border-b">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`px-3 py-1 rounded font-semibold ${
                        createType === "movie"
                          ? "bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
                          : "bg-white/5 hover:bg-white/10 text-slate-200"
                      }`}
                      onClick={() => setCreateType("movie")}
                    >
                      Movie
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1 rounded font-semibold ${
                        createType === "tv"
                          ? "bg-gradient-to-r from-pink-500 to-red-500 text-white shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
                          : "bg-white/5 hover:bg-white/10 text-slate-200"
                      }`}
                      onClick={() => setCreateType("tv")}
                    >
                      Show
                    </button>
                  </div>
                  <button
                    type="button"
                    className="text-2xl font-bold text-slate-500 hover:text-slate-200"
                    onClick={closeCreateModal}
                  >
                    ×
                  </button>
                </header>
                <div className="px-6 py-4 space-y-4">
                  {/* Search */}
                  <div>
                    <label className="block mb-1 font-semibold">
                      Search for a {createType === "movie" ? "movie" : "show"}
                    </label>
                    <input
                      type="text"
                      className="w-full border border-white/10 bg-white/5 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/80"
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
                      <div className="text-xs text-gray-500 mt-1">
                        Searching TMDB...
                      </div>
                    )}
                    {searchResults.length > 0 && (
                      <ul className="mt-1 bg-white shadow rounded border z-10 absolute w-[calc(100%-3rem)] max-w-lg">
                        {searchResults.map((r) => (
                          <li key={r.id}>
                            <button
                              type="button"
                              className="block w-full text-left px-4 py-2 hover:bg-blue-50"
                              onClick={() => handleSelectTitle(r)}
                            >
                              {r.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {selectedTitle && (
                      <div className="mt-1 text-green-700 text-sm font-medium">
                        Selected: {selectedTitle.label}
                      </div>
                    )}
                  </div>
                  {/* Rating */}
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">Rating:</span>
                      <div>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            className={`text-xl ${
                              i < rating
                                ? "text-yellow-400"
                                : "text-gray-300 hover:text-yellow-300"
                            }`}
                            onClick={() => setRating(i + 1)}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* TV season/ep */}
                  {createType === "tv" && (
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block mb-1 font-semibold">
                          Season (optional)
                        </label>
                        <input
                          type="number"
                          min={1}
                          className="w-full border border-white/10 bg-white/5 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/80"
                          value={seasonNumber}
                          onChange={(e) => setSeasonNumber(e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block mb-1 font-semibold">
                          Episode (optional)
                        </label>
                        <input
                          type="number"
                          min={1}
                          className="w-full border border-white/10 bg-white/5 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/80"
                          value={episodeNumber}
                          onChange={(e) => setEpisodeNumber(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                  {/* Comment */}
                  <div>
                    <label className="block mb-1 font-semibold">
                      Share your thoughts (optional)
                    </label>
                    <textarea
                      className="w-full border border-white/10 bg-white/5 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/80"
                      maxLength={1000}
                      placeholder="What did you think?"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <div className="text-xs text-gray-400 text-right">
                      {comment.length}/1000
                    </div>
                  </div>
                  {/* Watched at */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Watched on:</span>
                      <input
                        type="date"
                        className="border border-white/10 bg-white/5 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/80"
                        value={watchedAt}
                        onChange={(e) => setWatchedAt(e.target.value)}
                      />
                    </div>
                  </div>
                  {/* Circles */}
                  <div>
                    <div className="font-semibold mb-1">Post to circles:</div>
                    <div className="flex flex-wrap gap-2">
                      {circles.map((circle) => (
                        <button
                          key={circle._id}
                          type="button"
                          className={`px-3 py-1 rounded-full border text-sm font-medium ${
                            selectedCircleIds.includes(circle._id)
                              ? "bg-pink-600/80 border-pink-400 text-white shadow-[0_8px_20px_rgba(0,0,0,0.8)]"
                              : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10"
                          }`}
                          onClick={() => toggleCircleSelection(circle._id)}
                        >
                          {circle.name}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="px-3 py-1 rounded-full border border-dashed border-white/30 text-slate-300 hover:bg-white/10"
                        onClick={() => {
                          closeCreateModal();
                          navigate("/circles");
                        }}
                      >
                        +
                      </button>
                    </div>
                    {circles.length === 0 && (
                      <p className="text-sm text-gray-400 mt-2">
                        You are not in any circles yet. Tap + to create or join one.
                      </p>
                    )}
                  </div>
                  {postError && (
                    <div className="text-red-600 bg-red-50 px-3 py-2 rounded text-sm font-medium">
                      {postError}
                    </div>
                  )}
                </div>
                <footer className="flex justify-end gap-2 px-6 py-4 border-t">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-200"
                    onClick={closeCreateModal}
                    disabled={isSubmittingPost}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold shadow-[0_10px_30px_rgba(0,0,0,0.9)] hover:brightness-110"
                    onClick={handleSubmitPost}
                    disabled={isSubmittingPost}
                  >
                    {isSubmittingPost ? "Posting..." : "Post"}
                  </button>
                </footer>
              </div>
            </div>
          )}

          <section>
            {isLoading && (
              <div className="text-center text-gray-500 py-8">Loading your feed...</div>
            )}
            {error && !isLoading && (
              <div className="text-center text-red-600 py-8">{error}</div>
            )}
            {!isLoading && !error && posts.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                Make your first post or join your first circle to start your BFFlix feed.
              </div>
            )}
            {!isLoading &&
              !error &&
              posts.map((post) => (
                <article
                  key={post._id}
                  className="bg-[#070211]/90 rounded-2xl border border-white/8 shadow-[0_24px_60px_rgba(0,0,0,0.95)] mb-6 overflow-hidden"
                >
                  <header className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-lg font-bold text-pink-300 overflow-hidden">
                        {post.authorAvatarUrl ? (
                          <img
                            src={post.authorAvatarUrl}
                            alt={post.authorName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>
                            {post.authorName?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold">{post.authorName}</div>
                        <div className="text-xs text-gray-500">
                          Posted in: {post.circleNames.join(", ")}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatTimeAgo(post.createdAt)}
                    </div>
                  </header>
                  <div className="flex flex-col md:flex-row px-6 py-4 gap-6">
                    {post.imageUrl && (
                      <div className="md:w-32 md:flex-shrink-0 mb-4 md:mb-0">
                        <img
                          src={post.imageUrl}
                          alt={post.title}
                          className="w-24 h-36 object-cover rounded shadow"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="font-bold text-lg truncate">
                          {post.title}
                          {post.year ? ` (${post.year})` : ""}
                        </h2>
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          {post.type === "Movie" ? "Movie" : "Show"}
                        </span>
                      </div>
                      <div className="flex items-center mb-2">
                        <div
                          className="flex"
                          aria-label={`Rating ${post.rating} out of 5`}
                        >
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`text-xl ${
                              i < post.rating
                                ? "text-yellow-400"
                                : "text-slate-700"
                            }`}
                          >
                            ★
                          </span>
                        ))}
                        </div>
                      </div>
                      <p className="mb-2">{post.body}</p>
                      <div className="flex flex-wrap gap-2">
                        {post.services.map((service) => (
                          <span
                            key={service}
                            className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <footer className="flex items-center gap-2 px-6 py-3 border-t">
                    <button
                      className="flex items-center gap-1 text-lg px-2 py-1 rounded hover:bg-white/5"
                      type="button"
                      onClick={() => handleToggleLike(post._id, post.likedByMe)}
                    >
                      <span>{post.likedByMe ? "❤️" : "🤍"}</span>
                      <span className="text-base">{post.likeCount}</span>
                    </button>
                    <button
                      className="flex items-center gap-1 text-lg px-2 py-1 rounded hover:bg-white/5"
                      type="button"
                      onClick={() => handleToggleComments(post._id)}
                    >
                      <span>💬</span>
                      <span className="text-base">{post.commentCount}</span>
                    </button>
                    {post.authorId &&
                      currentUserId &&
                      post.authorId === currentUserId && (
                        <button
                          className="ml-auto flex items-center gap-1 px-3 py-1 rounded hover:bg-red-500/20 text-sm text-red-300"
                          type="button"
                          onClick={() => handleDeletePost(post._id)}
                        >
                          Delete
                        </button>
                      )}
                  </footer>
                  {openComments[post._id] && (
                    <div className="px-6 pb-4">
                      <div className="bg-white/5 rounded p-4 mt-2">
                        <div className="mb-2">
                          {commentsLoading[post._id] && (
                            <div className="text-slate-400">Loading comments...</div>
                          )}
                          {(comments[post._id] || []).map((c) => (
                            <div key={c.id} className="mb-2">
                              <div className="flex items-center justify-between gap-2 text-xs text-slate-300 mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">
                                    {currentUserId && c.userId === currentUserId ? "You" : c.userId}
                                  </span>
                                  <span>{new Date(c.createdAt).toLocaleString()}</span>
                                </div>
                                {currentUserId && c.userId === currentUserId && (
                                  <button
                                    type="button"
                                    className="text-[11px] text-red-300 hover:text-red-100 px-2 py-0.5 rounded-full hover:bg-red-500/10"
                                    onClick={() => handleDeleteComment(post._id, c.id)}
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                              <div className="ml-2">{c.text}</div>
                            </div>
                          ))}
                          {!commentsLoading[post._id] &&
                            (!comments[post._id] || comments[post._id].length === 0) && (
                              <div className="text-slate-400 text-sm">
                                No comments yet. Be the first!
                              </div>
                            )}
                        </div>
                        <textarea
                          className="w-full border border-white/10 bg-white/5 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/80"
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
                        <div className="mt-2 flex justify-end gap-2">
                          <button
                            type="button"
                            className="px-4 py-1 rounded-full bg-white/5 text-slate-200 text-sm hover:bg-white/10"
                            onClick={() => {
                              setOpenComments((prev) => ({ ...prev, [post._id]: false }));
                              setCommentDrafts((prev) => ({ ...prev, [post._id]: "" }));
                            }}
                            disabled={commentSubmitting[post._id]}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="px-4 py-1 rounded-full bg-gradient-to-r from-pink-500 to-red-500 text-white text-sm font-semibold hover:brightness-110 shadow-[0_10px_30px_rgba(0,0,0,0.9)]"
                            onClick={() => handleAddComment(post._id)}
                            disabled={commentSubmitting[post._id]}
                          >
                            {commentSubmitting[post._id] ? "Posting..." : "Post comment"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              ))}
          </section>
          {/* Pagination: Load more */}
          {nextCursor && posts.length > 0 && !isLoading && !error && (
            <div className="flex justify-center py-4">
              <button
                type="button"
                className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-200 text-sm font-medium border border-white/10"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? "Loading more..." : "Load more"}
              </button>
            </div>
          )}
        </main>

        {/* Right rail */}
        <aside className="w-80 flex-shrink-0 px-4 py-8 hidden lg:block text-slate-100 sticky top-0 h-screen">
          <section className="bg-[#070211]/90 rounded-2xl border border-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.9)] mb-6 p-4">
            <header className="mb-2">
              <h2 className="font-bold text-lg text-center">Your Circles</h2>
            </header>
            <div className="flex flex-col gap-2 mb-2">
              {circles.slice(0, 4).map((circle) => (
                <button
                  key={circle._id}
                  type="button"
                  className="w-full px-3 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-pink-500/30 shadow-[0_10px_30px_rgba(0,0,0,0.7)] transition flex flex-col items-center justify-center gap-1 text-slate-100 text-center"
                  onClick={() => navigate(`/circles/${circle._id}`)}
                >
                  <div className="font-semibold">{circle.name}</div>
                  <div className="text-xs text-gray-400">{circle.memberCount} members</div>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="mt-2 px-3 py-1 rounded-full bg-pink-600/90 text-white hover:bg-pink-500 text-sm font-semibold shadow-[0_10px_25px_rgba(0,0,0,0.9)] mx-auto block"
              onClick={() => navigate("/circles")}
            >
              View all circles
            </button>
          </section>
          <section className="bg-[#070211]/90 rounded-2xl border border-white/10 shadow-[0_18px_50px_rgba(0,0,0,0.9)] mb-6 p-4">
            <header className="mb-3">
              <h2 className="font-bold text-lg flex items-center justify-center gap-2 text-center">
                <span className="bg-gradient-to-r from-pink-500 to-red-500 text-white rounded px-2 py-0.5 text-xs">AI</span>
                AI Recommendations
              </h2>
            </header>
            <p className="text-sm text-gray-500 mb-2">
              Ask the BFFlix AI for movie and TV recommendations tailored to your taste.
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {aiSuggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="px-3 py-1 rounded-full bg-white/5 text-slate-100 text-xs font-medium hover:bg-white/10"
                  onClick={() =>
                    navigate("/ai", { state: { initialPrompt: s.text } })
                  }
                >
                  {s.text}
                </button>
              ))}
            </div>
            <button
              className="px-3 py-1 rounded-full bg-gradient-to-r from-pink-500 to-red-500 text-white text-sm font-semibold hover:brightness-110 shadow-[0_10px_30px_rgba(0,0,0,0.9)] mx-auto block"
              type="button"
              onClick={() => navigate("/ai")}
            >
              Open AI Assistant
            </button>
          </section>
          
        </aside>
      </div>
    </div>
  );
};

export default HomePage;
