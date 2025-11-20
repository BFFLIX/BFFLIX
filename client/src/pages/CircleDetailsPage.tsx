
// src/pages/CircleDetailsPage.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiDelete, apiGet, apiPost } from "../lib/api";
import LeftSidebar from "../components/LeftSidebar";
import TopBar from "../components/TopBar";

type MemberRole = "owner" | "moderator" | "member";

type Member = {
  id: string;
  name: string;
  email?: string;
  username?: string;
  role: MemberRole;
  isOwner?: boolean;
  isModerator?: boolean;
};

type CirclePermissions = {
  isOwner: boolean;
  isModerator: boolean;
  canInvite: boolean;
  canPromote: boolean;
};

type CircleDetail = {
  id: string;
  name: string;
  description?: string;
  visibility: "private" | "public";
  members: Member[];
  createdBy?: string;
  createdAt?: string;
  inviteCode?: string | null;
  permissions?: CirclePermissions;
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
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteIdentifier, setInviteIdentifier] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [modActionMemberId, setModActionMemberId] = useState<string | null>(null);
  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const [inviteLinkLoading, setInviteLinkLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setMemberActionError(null);

    try {
      const detail = await apiGet<any>(`/circles/${id}`);

      const members: Member[] = Array.isArray(detail?.members)
        ? detail.members.map((m: any) => ({
            id: String(m?.id || m?._id || m),
            name: m?.name || "Member",
            email: m?.email,
            username: m?.username,
            role:
              m?.role === "owner" || m?.role === "moderator"
                ? (m.role as MemberRole)
                : m?.isOwner
                ? "owner"
                : m?.isModerator
                ? "moderator"
                : "member",
            isOwner: Boolean(m?.isOwner || m?.role === "owner"),
            isModerator: Boolean(m?.isModerator || m?.role === "moderator"),
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
        inviteCode:
          typeof detail?.inviteCode === "string" ? detail.inviteCode : detail?.inviteCode ?? null,
        permissions:
          detail?.permissions ?? {
            isOwner: false,
            isModerator: false,
            canInvite: false,
            canPromote: false,
          },
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

  const memberList = useMemo(() => {
    if (!circle?.members) return [];
    const clone = [...circle.members];
    const rank = (member: Member) =>
      member.role === "owner" ? 0 : member.role === "moderator" ? 1 : 2;
    clone.sort((a, b) => {
      const diff = rank(a) - rank(b);
      if (diff !== 0) return diff;
      const nameA = a.name?.toLowerCase() ?? "";
      const nameB = b.name?.toLowerCase() ?? "";
      if (nameA < nameB) return -1;
      if (nameA > nameB) return 1;
      return 0;
    });
    return clone;
  }, [circle]);

  const inviteLink = useMemo(() => {
    if (!circle || !circle.id) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    if (!origin) return "";
    if (circle.visibility === "private") {
      if (!circle.inviteCode) return "";
      return `${origin}/circle-invite/${circle.id}/${circle.inviteCode}`;
    }
    return `${origin}/circles/${circle.id}`;
  }, [circle]);

  const handleSendInvite = useCallback(async () => {
    if (!id) return;
    if (!inviteIdentifier.trim()) {
      setInviteError("Enter a username or email");
      return;
    }

    try {
      setInviteSubmitting(true);
      setInviteError(null);
      setInviteFeedback(null);
      await apiPost(`/circles/${id}/invite`, {
        usernameOrEmail: inviteIdentifier.trim(),
      });
      setInviteFeedback("Invitation sent!");
      setInviteIdentifier("");
    } catch (err: any) {
      setInviteError(err?.message || "Unable to send invite");
    } finally {
      setInviteSubmitting(false);
    }
  }, [id, inviteIdentifier]);

  const handleCopyInviteLink = useCallback(async () => {
    if (!inviteLink) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteLink);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = inviteLink;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopyStatus("Invite link copied!");
      setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      setCopyStatus("Unable to copy link");
    }
  }, [inviteLink]);

  const handleRefreshInviteLink = useCallback(async () => {
    if (!id) return;
    try {
      setInviteLinkLoading(true);
      await apiPost(`/circles/${id}/rotate-invite`, {});
      await fetchAll();
      setCopyStatus("Invite link refreshed");
      setTimeout(() => setCopyStatus(null), 2000);
    } catch (err: any) {
      setInviteError(err?.message || "Unable to refresh invite link");
    } finally {
      setInviteLinkLoading(false);
    }
  }, [id, fetchAll]);

  const handleToggleModerator = async (member: Member) => {
    if (!id || !circle?.permissions?.canPromote || member.isOwner) return;

    try {
      setModActionMemberId(member.id);
      setMemberActionError(null);
      if (member.isModerator) {
        await apiDelete(`/circles/${id}/mods/${member.id}`);
      } else {
        await apiPost(`/circles/${id}/mods/${member.id}`, {});
      }
      await fetchAll();
    } catch (err: any) {
      setMemberActionError(err?.message || "Unable to update member");
    } finally {
      setModActionMemberId(null);
    }
  };

  return (
    <>
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
                    <div className="flex items-center justify-between mb-4 gap-2">
                      <div>
                        <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
                          Members
                        </h2>
                        <span className="text-xs text-slate-500">
                          {memberList.length} total
                        </span>
                      </div>
                      {circle?.permissions?.canInvite && (
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs font-semibold shadow hover:brightness-110 transition"
                          onClick={() => {
                            setInviteModalOpen(true);
                            setInviteError(null);
                            setInviteFeedback(null);
                            setCopyStatus(null);
                          }}
                        >
                          Invite
                        </button>
                      )}
                    </div>

                    {memberActionError && (
                      <div className="mb-2 text-xs text-red-400">{memberActionError}</div>
                    )}

                    {memberList.length === 0 ? (
                      <div className="text-sm text-slate-400">
                        No members to show.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                        {memberList.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/5/10 px-3 py-2.5"
                          >
                            <div className="flex items-center gap-3">
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
                              {m.username && (
                                <span className="text-xs text-slate-500">
                                  @{m.username}
                                </span>
                              )}
                                <div className="mt-1 flex flex-wrap gap-1">
                                  <span
                                    className={`text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                                      m.isOwner
                                        ? "bg-amber-500/20 border-amber-400/30 text-amber-200"
                                        : m.isModerator
                                        ? "bg-indigo-500/20 border-indigo-400/30 text-indigo-100"
                                        : "bg-slate-800 border-slate-700 text-slate-300"
                                    }`}
                                  >
                                    {m.isOwner ? "Owner" : m.isModerator ? "Moderator" : "Member"}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {circle?.permissions?.canPromote && !m.isOwner && (
                              <button
                                type="button"
                                className="text-xs font-semibold px-3 py-1 rounded-full border border-white/10 text-slate-200 hover:bg-white/10 transition disabled:opacity-60"
                                disabled={modActionMemberId === m.id}
                                onClick={() => handleToggleModerator(m)}
                              >
                                {modActionMemberId === m.id
                                  ? "Saving..."
                                  : m.isModerator
                                  ? "Remove mod"
                                  : "Make mod"}
                              </button>
                            )}
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

      {inviteModalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950/90 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Invite members</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Send an invite by username/email or share an invite link.
                </p>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-white transition"
                onClick={() => setInviteModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-2">
              <label className="text-xs uppercase tracking-wide text-slate-400">
                Username or email
              </label>
              <input
                type="text"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                placeholder="ex: @username or test@example.com"
                value={inviteIdentifier}
                onChange={(e) => setInviteIdentifier(e.target.value)}
              />
            </div>
            {inviteError && (
              <div className="mt-2 text-sm text-red-400">{inviteError}</div>
            )}
            {inviteFeedback && (
              <div className="mt-2 text-sm text-emerald-400">{inviteFeedback}</div>
            )}

            {circle?.permissions?.canInvite && (
              <div className="mt-6 space-y-2">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  Invite link
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none"
                      value={
                        inviteLink ||
                        "Generate a link to share this circle with others."
                      }
                      readOnly
                    />
                    <button
                      type="button"
                      className="px-3 py-2 rounded-full bg-white/10 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-40"
                      onClick={handleCopyInviteLink}
                      disabled={!inviteLink}
                    >
                      Copy
                    </button>
                  </div>
                  {circle.permissions?.isOwner && circle.visibility === "private" && (
                    <button
                      type="button"
                      className="self-start text-xs text-slate-400 hover:text-white"
                      onClick={handleRefreshInviteLink}
                      disabled={inviteLinkLoading}
                    >
                      {inviteLinkLoading ? "Refreshing link..." : "Generate new link"}
                    </button>
                  )}
                  {copyStatus && (
                    <div className="text-xs text-emerald-400">{copyStatus}</div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-full bg-white/5 text-sm text-slate-200 border border-white/10 hover:bg-white/10"
                onClick={() => setInviteModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-red-500 text-white text-sm font-semibold shadow hover:brightness-110 disabled:opacity-60"
                onClick={handleSendInvite}
                disabled={inviteSubmitting}
              >
                {inviteSubmitting ? "Sending..." : "Send invite"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CircleDetailsPage;
