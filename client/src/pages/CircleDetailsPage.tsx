import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGet } from "../lib/api";
import bfflixLogo from "../assets/bfflix-logo.svg";
import "../styles/CirclesPage.css";
import "../styles/HomePage.css";

type Member = { id: string; name: string; email?: string };

type CircleDetail = {
  id: string;
  name: string;
  description?: string;
  visibility: "private" | "public";
  members: Member[];
  createdBy?: string;
  createdAt?: string;
};

type FeedPost = {
  _id: string;
  authorName: string;
  circleNames: string[];
  createdAt: string;
  title: string;
  year?: number;
  type: "Movie" | "Show";
  rating: number;
  body: string;
  services: string[];
  likeCount: number;
  commentCount: number;
  imageUrl?: string;
};

const CircleDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [circle, setCircle] = useState<CircleDetail | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await apiGet<any>(`/circles/${id}`);
      const members: Member[] = Array.isArray(detail?.members)
        ? detail.members.map((m: any) => ({
            id: String(m?.id || m?._id || m),
            name: m?.name || "Member",
            email: m?.email,
          }))
        : [];

      setCircle({
        id: String(detail?.id || id),
        name: detail?.name || "Untitled circle",
        description: detail?.description,
        visibility: detail?.visibility || "private",
        members,
        createdBy: detail?.createdBy ? String(detail.createdBy) : undefined,
        createdAt: detail?.createdAt,
      });

      const feed = await apiGet<{ items: FeedPost[] }>(
        `/posts/circle/${id}?page=1&limit=50`
      );
      const filtered = Array.isArray((feed as any)?.items)
        ? (feed as any).items
        : Array.isArray(feed)
        ? (feed as any)
        : [];
      setPosts(filtered);
    } catch (err: any) {
      console.error("Circle detail load failed", err);
      const msg =
        err?.message === "forbidden"
          ? "You do not have access to this circle."
          : err?.message || "Failed to load circle details";
      setError(msg);
      setCircle(null);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const memberList = useMemo(() => circle?.members || [], [circle]);

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
            <button
              className="app-nav-item"
              type="button"
              onClick={() => navigate("/home")}
            >
              <span className="app-nav-icon">🏠</span>
              <span>Home</span>
            </button>
            <button
              className="app-nav-item app-nav-item--active"
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
            <button className="app-nav-item" type="button">
              <span className="app-nav-icon">👤</span>
              <span>Profile</span>
            </button>
          </nav>

          <button className="app-logout-button" type="button">
            Log out
          </button>
        </aside>

        <main className="app-feed circles-page">
          {error && <div className="circles-error">{error}</div>}
          {loading && <div className="circles-loading">Loading...</div>}

          {!loading && !circle && !error && (
            <div className="circles-empty">Circle not found.</div>
          )}

          {!loading && circle && (
            <>
              <header className="circles-header">
                {!loading && circle && (
                  <>
                    <button 
                      type="button"
                      className="circle-back-button"
                      onClick={() => navigate("/circles")}
                    >
                      ←Back
                    </button>
                    <header className="circles-header">
                      <div className="circles-header-main">
                        <div className="circles-title-row">
                          <span className="circles-icon">👥</span>
                          <h2 className="circles-title">{circle.name}</h2>
                        </div>
                        {circle.description && (
                          <p className="circles-subtitle">{circle.description}</p>
                        )}
                      </div>
                    </header>
                  </>
                )}
                <div className="circles-header-main">
                  <div className="circles-title-row">
                    <span className="circles-icon">👥</span>
                    <h2 className="circles-title">{circle.name}</h2>
                  </div>
                  {circle.description && (
                    <p className="circles-subtitle">{circle.description}</p>
                  )}
                </div>
              </header>

              <section className="circle-detail-panel">
                <div className="circle-detail-meta">
                  <span className="circle-card-visibility circle-card-visibility--public">
                    {circle.visibility === "public" ? "Public" : "Private"}
                  </span>
                  <span className="circle-card-meta-text">
                    {memberList.length} members
                  </span>
                </div>

                <div className="circle-members-list">
                  {memberList.map((m) => (
                    <div key={m.id} className="circle-member-item">
                      <div className="circle-member-avatar">
                        {m.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="circle-member-meta">
                        <div className="circle-member-name">{m.name}</div>
                        {m.email && (
                          <div className="circle-member-email">{m.email}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {memberList.length === 0 && (
                    <div className="circles-empty">No members to show.</div>
                  )}
                </div>
              </section>

              <section className="circle-posts-section">
                <h3 className="circle-posts-title">Posts in this circle</h3>
                {posts.length === 0 ? (
                  <div className="circles-empty">No posts yet.</div>
                ) : (
                  posts.map((post) => (
                    <article key={post._id} className="feed-card">
                      <header className="feed-card-header">
                        <div className="feed-card-author">
                          <div className="feed-card-avatar">
                            <span>
                              {post.authorName?.charAt(0).toUpperCase() || 'Unknown'}
                            </span>
                          </div>
                          <div className="feed-card-author-meta">
                            <div className="feed-card-author-name">
                              {post.authorName}
                            </div>
                            <div className="feed-card-subtitle">
                              {post.circleNames?.join(", ") || "No circles"}
                            </div>
                          </div>
                        </div>
                        <div className="feed-card-timestamp">
                          {new Date(post.createdAt).toLocaleString()}
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
                            <div className="feed-card-stars">
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
                            {(Array.isArray(post.services) ? post.services : []).map((service) => (
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
                    </article>
                  ))
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default CircleDetailsPage;
