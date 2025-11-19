
// src/pages/CircleDetailsPage.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGet } from "../lib/api";
import LeftSidebar from "../components/LeftSidebar";
import TopBar from "../components/TopBar";

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

const CircleDetailsPage = () => {
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

      const feed = await apiGet<any>(`/posts/circle/${id}?page=1&limit=50`);

      const rawItems: any[] = Array.isArray(feed?.items)
        ? feed.items
        : Array.isArray(feed)
        ? feed
        : [];

      const normalized: FeedPost[] = rawItems.map((item) => {
        // Derive author name from various possible shapes
        const authorName =
          item.authorName ||
          item.author?.name ||
          item.author?.fullName ||
          item.author?.displayName ||
          "Unknown user";

        // Derive circle names either from a prepared array or from a `circles` array
        const circleNames: string[] = Array.isArray(item.circleNames)
          ? item.circleNames
          : Array.isArray(item.circles)
          ? item.circles
              .map((c: any) => c?.name)
              .filter((n: any): n is string => Boolean(n))
          : [];

        // Title / year may be stored under different keys
        const title =
          item.title || item.mediaTitle || item.movieTitle || item.showTitle || "";
        const year =
          typeof item.year === "number"
            ? item.year
            : typeof item.mediaYear === "number"
            ? item.mediaYear
            : undefined;

        // Determine type (Movie / Show)
        const type: FeedPost["type"] =
          item.type === "Show" || item.type === "Movie"
            ? item.type
            : item.mediaType === "tv" || item.mediaType === "show"
            ? "Show"
            : "Movie";

        // Services / platforms
        const services: string[] = Array.isArray(item.services)
          ? item.services
          : Array.isArray(item.platforms)
          ? item.platforms
          : [];

        return {
          _id: String(item._id ?? item.id),
          authorName,
          circleNames,
          createdAt: item.createdAt ?? item.created_at ?? new Date().toISOString(),
          title,
          year,
          type,
          rating: typeof item.rating === "number" ? item.rating : item.score ?? 0,
          body: item.body || item.text || "",
          services,
          likeCount:
            typeof item.likeCount === "number"
              ? item.likeCount
              : typeof item.likes === "number"
              ? item.likes
              : 0,
          commentCount:
            typeof item.commentCount === "number"
              ? item.commentCount
              : typeof item.comments === "number"
              ? item.comments
              : 0,
          imageUrl: item.imageUrl || item.posterUrl || item.backdropUrl || undefined,
        };
      });

      setPosts(normalized);
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
    <div className="min-h-screen text-slate-50 flex flex-col">
      {/* Top bar (global) */}
      <TopBar />

      <div className="flex flex-1">
        {/* Left sidebar (global) */}
        <LeftSidebar />

        {/* Main content */}
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Back button */}
            <button
              type="button"
              onClick={() => navigate("/circles")}
              className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white mb-2"
            >
              <span className="text-lg">←</span>
              <span>Back to circles</span>
            </button>

            {/* Error / Loading / Empty states */}
            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}

            {loading && (
              <div className="flex justify-center py-16 text-slate-400">
                Loading circle details...
              </div>
            )}

            {!loading && !circle && !error && (
              <div className="flex justify-center py-16 text-slate-400">
                Circle not found.
              </div>
            )}

            {/* Main circle content */}
            {!loading && circle && (
              <>
                {/* Circle header card */}
                <section className="rounded-2xl border border-white/5 bg-white/5/10 bg-gradient-to-br from-white/5 to-white/0 px-5 py-4 md:px-6 md:py-5 shadow-[0_0_40px_rgba(0,0,0,0.7)]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-red-500 text-xl">
                          👥
                        </div>
                        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
                          {circle.name}
                        </h1>
                      </div>
                      {circle.description && (
                        <p className="mt-2 text-sm text-slate-300 max-w-2xl">
                          {circle.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 font-medium ${
                          circle.visibility === "public"
                            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-500/10 text-slate-200 border border-slate-500/40"
                        }`}
                      >
                        {circle.visibility === "public" ? "Public circle" : "Private circle"}
                      </span>
                      <span className="inline-flex items-center rounded-full px-3 py-1 bg-slate-900/60 border border-white/5 text-slate-200">
                        {memberList.length} member
                        {memberList.length === 1 ? "" : "s"}
                      </span>
                      {circle.createdAt && (
                        <span className="inline-flex items-center rounded-full px-3 py-1 bg-slate-900/60 border border-white/5 text-slate-400">
                          Created{" "}
                          {new Date(circle.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </section>

                {/* Grid: Members + Posts */}
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Members panel */}
                  <section className="rounded-2xl border border-white/5 bg-slate-950/60 px-4 py-4 md:px-5 md:py-5 shadow-[0_0_40px_rgba(0,0,0,0.7)] lg:col-span-1">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
                        Members
                      </h2>
                      <span className="text-xs text-slate-400">
                        {memberList.length} total
                      </span>
                    </div>

                    {memberList.length === 0 ? (
                      <div className="text-sm text-slate-400">
                        No members to show.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                        {memberList.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5/10 px-3 py-2.5"
                          >
                            <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-red-500 text-sm font-semibold">
                              {m.name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-50">
                                {m.name}
                              </span>
                              {m.email && (
                                <span className="text-xs text-slate-400">
                                  {m.email}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Posts panel */}
                  <section className="rounded-2xl border border-white/5 bg-slate-950/60 px-4 py-4 md:px-5 md:py-5 shadow-[0_0_40px_rgba(0,0,0,0.7)] lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
                        Posts in this circle
                      </h2>
                      <span className="text-xs text-slate-400">
                        {posts.length} post{posts.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    {posts.length === 0 ? (
                      <div className="text-sm text-slate-400">
                        No posts yet. Be the first to share a viewing in this circle.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {posts.map((post) => (
                          <article
                            key={post._id}
                            className="rounded-2xl border border-white/5 bg-white/5/10 p-4 md:p-5"
                          >
                            {/* Post header */}
                            <header className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-red-500 text-sm font-semibold">
                                  {post.authorName?.charAt(0).toUpperCase() || "?"}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-slate-50">
                                    {post.authorName}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    {post.circleNames?.join(", ") || "No circles"}
                                  </span>
                                </div>
                              </div>
                              <div className="text-xs text-slate-500">
                                {new Date(post.createdAt).toLocaleString()}
                              </div>
                            </header>

                            {/* Post body */}
                            <div className="mt-4 flex flex-col gap-4 md:flex-row">
                              {post.imageUrl && (
                                <div className="md:w-32 flex-shrink-0">
                                  <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
                                    <img
                                      src={post.imageUrl}
                                      alt={post.title}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                </div>
                              )}

                              <div className="flex-1 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-base md:text-lg font-semibold text-slate-50">
                                      {post.title}
                                      {post.year ? ` (${post.year})` : ""}
                                    </h3>
                                  </div>
                                  <span className="inline-flex items-center rounded-full bg-slate-900/70 px-3 py-1 text-xs text-slate-200 border border-white/10">
                                    {post.type === "Movie" ? "Movie" : "Show"}
                                  </span>
                                </div>

                                {/* Rating */}
                                <div className="flex items-center gap-2">
                                  <div className="flex text-sm">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <span
                                        key={i}
                                        className={
                                          i < post.rating
                                            ? "text-yellow-400"
                                            : "text-slate-600"
                                        }
                                      >
                                        ★
                                      </span>
                                    ))}
                                  </div>
                                  <span className="text-xs text-slate-400">
                                    {post.rating}/5
                                  </span>
                                </div>

                                <p className="text-sm text-slate-200 whitespace-pre-line">
                                  {post.body}
                                </p>

                                {/* Services pills */}
                                {Array.isArray(post.services) &&
                                  post.services.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {post.services.map((service) => (
                                        <span
                                          key={service}
                                          className="inline-flex items-center rounded-full bg-slate-900/70 px-3 py-1 text-xs text-slate-200 border border-white/10"
                                        >
                                          {service}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                {/* Simple meta counts */}
                                <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                                  <span>👍 {post.likeCount ?? 0}</span>
                                  <span>💬 {post.commentCount ?? 0}</span>
                                </div>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CircleDetailsPage;
