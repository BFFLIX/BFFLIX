
// src/pages/HomePage.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import bfflixLogo from "../assets/bfflix-logo.svg";
import { apiGet, apiPost } from "../lib/api";
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
  authorName: string;
  authorAvatarUrl?: string;
  circleNames: string[];
  createdAt: string;
  title: string;
  year?: number;
  type: "Movie" | "Show";
  rating: number;
  body: string;
  services: ServiceTag[];
  likeCount: number;
  commentCount: number;
  imageUrl?: string;
};

type AiSuggestion = {
  id: string;
  text: string;
};

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

// ----------------- Component -----------------

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"all" | "circles" | "mine">("all");
  const [activeService, setActiveService] = useState<
    ServiceTag | "All services"
  >("All services");
  const [sortOrder, setSortOrder] = useState<"newest" | "top">("newest");

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [recentViewings, setRecentViewings] = useState<RecentViewing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ----------------- Create Post state -----------------

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
    try {
      setIsLoading(true);
      setError(null);

      const [feedData, circlesData, aiData, recentData] = await Promise.all([
        apiGet<FeedPost[]>(
          `/feed?scope=${encodeURIComponent(
            activeTab
          )}&sort=${encodeURIComponent(sortOrder)}${
            activeService === "All services"
              ? ""
              : `&service=${encodeURIComponent(activeService)}`
          }`
        ),
        apiGet<Circle[]>("/circles"),
        apiGet<AiSuggestion[]>("/ai/suggestions"),
        apiGet<RecentViewing[]>("/viewings/recent"),
      ]);

      setPosts(feedData);
      setCircles(circlesData);
      setAiSuggestions(aiData);
      setRecentViewings(recentData);
    } catch (err) {
      console.error("Error loading home data", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load your BFFlix feed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, activeService, sortOrder]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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
        // backend expects a Date; this is YYYY-MM-DD so it will parse fine
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

  // ----------------- Render -----------------

  return (
    <div className="app-shell">
      <div className="app-main-layout">
        {/* Left sidebar */}
        <aside className="app-sidebar">
          <div className="app-sidebar-brand">
            <img
              src={bfflixLogo}
              alt="BFFLIX"
              className="app-sidebar-logo-img"
            />
          </div>

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
            <button
              className="app-nav-item"
              type="button"
              onClick={() => navigate("/profile")}
            >
              <span className="app-nav-icon">👤</span>
              <span>Profile</span>
            </button>
          </nav>

          <button className="app-logout-button">Log out</button>
        </aside>

        {/* Center feed */}
        <main className="app-feed">
          <header className="feed-header">
            <h1 className="feed-title">Home</h1>

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
                    setSortOrder(e.target.value as "newest" | "top")
                  }
                >
                  <option value="newest">Newest</option>
                  <option value="top">Top rated</option>
                </select>
              </div>
            </div>
          </header>

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
                      <span className="create-post-label">Post to circles:</span>
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
                        >
                          +
                        </button>
                      </div>
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
                    <button className="feed-footer-action">
                      <span>❤️</span>
                      <span>{post.likeCount}</span>
                    </button>
                    <button className="feed-footer-action">
                      <span>💬</span>
                      <span>{post.commentCount}</span>
                    </button>
                    <button className="feed-footer-action feed-footer-action--right">
                      🔖
                    </button>
                  </footer>
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
                <button key={s.id} className="rail-ai-chip">
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
              <h2 className="rail-card-title">Recently Watched</h2>
            </header>
            <div className="rail-recent-list">
              {recentViewings.map((item) => (
                <div key={item.id} className="rail-recent-item">
                  <div className="rail-recent-poster">
                    {item.posterUrl ? (
                      <img src={item.posterUrl} alt={item.title} />
                    ) : (
                      <div className="rail-recent-placeholder" />
                    )}
                  </div>
                  <div className="rail-recent-meta">
                    <div className="rail-recent-title">{item.title}</div>
                    <div className="rail-recent-stars">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={
                            i < item.rating
                              ? "feed-star feed-star--filled"
                              : "feed-star"
                          }
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
