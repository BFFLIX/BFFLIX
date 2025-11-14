
// src/pages/HomePage.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

// ----------------- Types -----------------

type Circle = {
  _id: string;
  name: string;
  memberCount: number;
};

type ServiceTag = "Netflix" | "Hulu" | "Prime Video" | "Disney+" | "Max" | "Apple TV+";

type FeedPost = {
  _id: string;
  authorName: string;
  authorAvatarUrl?: string;
  circleNames: string[];
  createdAt: string;
  title: string;
  year?: number;
  type: "Movie" | "Show";
  rating: number; // 0 - 5
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

// ----------------- Component -----------------

const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"all" | "circles" | "mine">("all");
  const [activeService, setActiveService] = useState<ServiceTag | "All services">(
    "All services"
  );
  const [sortOrder, setSortOrder] = useState<"newest" | "top">("newest");

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [recentViewings, setRecentViewings] = useState<RecentViewing[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ----------------- Data loading -----------------

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setIsLoading(true);

        // Adjust these endpoints to match your backend
        const [feedRes, circlesRes, aiRes, recentRes] = await Promise.all([
          axios.get<FeedPost[]>(`${API_BASE}/feed`, {
            params: {
              scope: activeTab,          // "all" | "circles" | "mine"
              service:
                activeService === "All services" ? undefined : activeService,
              sort: sortOrder            // "newest" | "top"
            },
            withCredentials: true,
          }),
          axios.get<Circle[]>(`${API_BASE}/circles/my`, {
            withCredentials: true,
          }),
          axios.get<AiSuggestion[]>(`${API_BASE}/ai/suggestions`, {
            withCredentials: true,
          }),
          axios.get<RecentViewing[]>(`${API_BASE}/viewings/recent`, {
            withCredentials: true,
          }),
        ]);

        setPosts(feedRes.data);
        setCircles(circlesRes.data);
        setAiSuggestions(aiRes.data);
        setRecentViewings(recentRes.data);
      } catch (err) {
        console.error("Error loading home data", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();
  }, [activeTab, activeService, sortOrder]);

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

  // ----------------- Render -----------------

  return (
    <div className="app-shell">
      <div className="app-main-layout">
        {/* Left sidebar */}
        <aside className="app-sidebar">
          <div className="app-sidebar-logo">BFFLIX</div>

          <nav className="app-sidebar-nav">
            <button className="app-nav-item app-nav-item--active">
              <span className="app-nav-icon">🏠</span>
              <span>Home</span>
            </button>
            <button className="app-nav-item">
              <span className="app-nav-icon">👥</span>
              <span>Circles</span>
            </button>
            <button className="app-nav-item">
              <span className="app-nav-icon">🎬</span>
              <span>Viewings</span>
            </button>
            <button className="app-nav-item">
              <span className="app-nav-icon">🤖</span>
              <span>AI Assistant</span>
            </button>
            <button className="app-nav-item">
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

              <button className="feed-new-post-button">+ Post</button>
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

          <section className="feed-list">
            {isLoading && (
              <div className="feed-loading">Loading your feed...</div>
            )}

            {!isLoading && posts.length === 0 && (
              <div className="feed-empty">
                No posts yet. Try changing filters or creating your first post.
              </div>
            )}

            {posts.map((post) => (
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
                      <div className="feed-card-stars" aria-label={`Rating ${post.rating} out of 5`}>
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
                        <span
                          key={service}
                          className="feed-service-pill"
                        >
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
            <button className="rail-view-all">View all circles</button>
          </section>

          <section className="rail-card rail-card-ai">
            <header className="rail-card-header">
              <h2 className="rail-card-title">
                <span className="rail-ai-icon">📈</span> AI Recommendations
              </h2>
            </header>
            <p className="rail-ai-text">
              Ask the BFFlix AI for movie and TV recommendations tailored to your
              taste.
            </p>
            <div className="rail-ai-chip-list">
              {aiSuggestions.map((s) => (
                <button key={s.id} className="rail-ai-chip">
                  {s.text}
                </button>
              ))}
            </div>
            <button className="rail-ai-button">Open AI Assistant</button>
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

          <button className="rail-floating-ai-button">🤖</button>
        </aside>
      </div>
    </div>
  );
};

export default HomePage;