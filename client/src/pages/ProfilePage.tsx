// src/pages/ProfilePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";
import LeftSidebar from "../components/LeftSidebar";
import defaultAvatar from "../assets/default-avatar.svg";
import { apiGet, apiPatch } from "../lib/api";
import { fetchTmdbTitleDetails } from "../lib/TMDBService";

// ===== Types and helpers =====

type CircleVisibility = "private" | "public";

type Circle = {
  id?: string;
  _id?: string;
  circleId?: string;
  name?: string;
  visibility?: CircleVisibility;
  circle?: Circle;
  [key: string]: any;
};

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

const SERVICE_OPTIONS = [
  { key: "netflix", label: "Netflix" },
  { key: "hulu", label: "Hulu" },
  { key: "max", label: "Max" },
  { key: "prime", label: "Prime Video" },
  { key: "disney", label: "Disney+" },
  { key: "peacock", label: "Peacock" },
] as const;

type ServiceKey = (typeof SERVICE_OPTIONS)[number]["key"];


const SERVICE_KEY_SET = new Set<ServiceKey>(
  SERVICE_OPTIONS.map((option) => option.key)
);

const SERVICE_LABEL_MAP: Record<ServiceKey, string> = SERVICE_OPTIONS.reduce(
  (acc, option) => {
    acc[option.key] = option.label;
    return acc;
  },
  {} as Record<ServiceKey, string>
);

type UserResponse = {
  name: string;
  avatarUrl?: string | null;
  services?: ServiceKey[] | null;
};

const orderServices = (services: Iterable<ServiceKey>): ServiceKey[] => {
  const set = new Set<ServiceKey>(services);
  return SERVICE_OPTIONS.map((option) => option.key).filter((key) => set.has(key));
};

const normalizeServices = (list: unknown): ServiceKey[] => {
  if (!Array.isArray(list)) return [];
  const matches: ServiceKey[] = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const normalized = item.toLowerCase() as ServiceKey;
    if (SERVICE_KEY_SET.has(normalized)) {
      matches.push(normalized);
    }
  }
  return orderServices(matches);
};

const MAX_RECENT_VIEWINGS = 3;
const MAX_AVATAR_BYTES = 600 * 1024; // ~600KB
const VIEWINGS_VISIBILITY_KEY = "profile:viewingsVisibility";
const DATA_URL_REGEX = /^data:image\/[a-zA-Z]+;base64,/;

const getCircleBase = (circle: Circle): Circle => {
  return (circle.circle as Circle) || circle;
};

const getCircleId = (circle: Circle): string | null => {
  if (circle.id) return String(circle.id);
  if (circle._id) return String(circle._id);
  if (circle.circleId) return String(circle.circleId);

  if (circle.circle) {
    const inner = circle.circle as Circle;
    if (inner.id) return String(inner.id);
    if (inner._id) return String(inner._id);
    if (inner.circleId) return String(inner.circleId);
  }

  return null;
};

const getCircleName = (circle: Circle): string => {
  const base = getCircleBase(circle);
  return base.name || "Untitled circle";
};

const getCircleVisibility = (circle: Circle): CircleVisibility => {
  const base = getCircleBase(circle);
  const value = typeof base.visibility === "string" ? base.visibility.toLowerCase() : "";
  return value === "public" ? "public" : "private";
};

const isCirclePublic = (circle: Circle) => getCircleVisibility(circle) === "public";

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

// ===== Component =====

export default function ProfilePage() {
  const navigate = useNavigate();

  // User info state
  const [userName, setUserName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [userServices, setUserServices] = useState<ServiceKey[]>([]);
  const [editServices, setEditServices] = useState<ServiceKey[]>([]);

  // Circles state
  const [circles, setCircles] = useState<Circle[]>([]);
  const [circlesLoading, setCirclesLoading] = useState(false);
  const [circlesError, setCirclesError] = useState<string | null>(null);

  // Viewings state
  const [viewings, setViewings] = useState<ProfileViewing[]>([]);
  const [viewingsCount, setViewingsCount] = useState(0);
  const [viewingsLoading, setViewingsLoading] = useState(false);
  const [viewingsError, setViewingsError] = useState<string | null>(null);
  const [viewingsPublic, setViewingsPublic] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(VIEWINGS_VISIBILITY_KEY);
    if (stored === "private") return false;
    if (stored === "public") return true;
    return true;
  });

  const publicCircles = useMemo(() => circles.filter(isCirclePublic), [circles]);

  // Fetch /me
  useEffect(() => {
    const fetchMe = async () => {
      try {
        setUserLoading(true);
        setUserError(null);
        const res = await apiGet<UserResponse>("/me");
        setUserName(res.name);
        setAvatarUrl(res.avatarUrl || "");
        const normalizedServices = normalizeServices(res.services);
        setUserServices(normalizedServices);
        setEditServices(normalizedServices);
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

  const openEditProfile = () => {
    setIsEditingProfile(true);
    setEditName(userName);
    setEditAvatarUrl(avatarUrl);
    setEditServices(userServices);
    setProfileSaveError(null);
  };

  const closeEditProfile = () => {
    setIsEditingProfile(false);
    setProfileSaveError(null);
  };

  const toggleServiceSelection = (serviceKey: ServiceKey) => {
    setEditServices((prev) => {
      const next = prev.includes(serviceKey)
        ? prev.filter((key) => key !== serviceKey)
        : [...prev, serviceKey];
      return orderServices(next);
    });
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editName.trim()) {
      setProfileSaveError("Display name is required.");
      return;
    }

    try {
      setSavingProfile(true);
      setProfileSaveError(null);
      const payload = {
        name: editName.trim(),
        avatarUrl: editAvatarUrl.trim(),
        services: editServices,
      };
      const updated = await apiPatch<UserResponse>("/me", payload);
      setUserName(updated.name);
      setAvatarUrl(updated.avatarUrl || "");
      const normalizedServices = normalizeServices(updated.services);
      setUserServices(normalizedServices);
      setEditServices(normalizedServices);
      setIsEditingProfile(false);
    } catch (err: any) {
      setProfileSaveError(err.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleViewingsVisibility = () => {
    const next = !viewingsPublic;
    setViewingsPublic(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        VIEWINGS_VISIBILITY_KEY,
        next ? "public" : "private"
      );
    }
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setProfileSaveError("Please upload an image file (png, jpg, gif, webp).");
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setProfileSaveError("Avatar must be under 600KB. Try a smaller image.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string" && DATA_URL_REGEX.test(result)) {
        setEditAvatarUrl(result);
        setProfileSaveError(null);
      } else {
        setProfileSaveError("Failed to read image. Please try another file.");
      }
    };
    reader.onerror = () => {
      setProfileSaveError("Failed to read image. Please try again.");
    };
    reader.readAsDataURL(file);
  };

  const clearAvatarSelection = () => {
    setEditAvatarUrl("");
  };

  return (
    <div className="min-h-screen bg-bfflix-navy text-slate-50">
      <TopBar />
      <div className="flex">
        <LeftSidebar />

        <main className="flex-1 px-4 py-6 pt-16 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row">
            {/* Left column: profile summary and edit */}
            <section className="w-full space-y-6 lg:w-2/5">
              <div className="rounded-2xl bg-slate-900/70 p-6 shadow-xl ring-1 ring-white/5">
                <div className="flex items-start gap-4">
                  <div className="relative h-20 w-20 flex-shrink-0">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={`${userName || "User"} avatar`}
                        className="h-20 w-20 rounded-full object-cover shadow-lg"
                      />
                    ) : (
                      <div className="relative h-20 w-20">
                        <img
                          src={defaultAvatar}
                          alt="Default profile avatar"
                          className="h-20 w-20 rounded-full object-cover opacity-60"
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-2xl font-semibold text-slate-100">
                          {profileInitial}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold tracking-tight text-slate-50">
                        Your profile
                      </h2>
                      {userLoading && (
                        <span className="text-xs text-slate-400">Loading...</span>
                      )}
                      {userError && (
                        <span className="text-xs text-rose-400">{userError}</span>
                      )}
                    </div>

                    {!userLoading && !userError && (
                      <p className="mt-1 text-sm text-slate-200">
                        Welcome back, {userName || "BFFLixer"}!
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      Keep tabs on what you are watching and the circles you hang out in.
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-center text-xs">
                      <div className="rounded-xl bg-slate-800/80 px-3 py-2">
                        <div className="text-lg font-semibold text-slate-50">
                          {publicCircles.length}
                        </div>
                        <div className="text-[0.7rem] uppercase tracking-wide text-slate-400">
                          Public circles
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-800/80 px-3 py-2">
                        <div className="text-lg font-semibold text-slate-50">
                          {viewingsCount}
                        </div>
                        <div className="text-[0.7rem] uppercase tracking-wide text-slate-400">
                          Viewings logged
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-medium text-slate-300">
                        Streaming services you use
                      </p>
                      {userLoading ? (
                        <p className="text-xs text-slate-400">Loading services...</p>
                      ) : userServices.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {userServices.map((service) => (
                            <span
                              key={service}
                              className="inline-flex items-center rounded-full bg-slate-800/80 px-3 py-1 text-[0.7rem] font-medium text-slate-100 ring-1 ring-white/10"
                            >
                              {SERVICE_LABEL_MAP[service]}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">
                          You have not selected any streaming services yet.
                        </p>
                      )}
                    </div>

                    {!isEditingProfile && (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={openEditProfile}
                          className="inline-flex items-center rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bfflix-navy"
                        >
                          Edit profile
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {isEditingProfile && (
                <form
                  onSubmit={handleSaveProfile}
                  className="space-y-4 rounded-2xl bg-slate-900/80 p-5 shadow-xl ring-1 ring-white/5"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1 text-xs text-slate-200">
                      <span className="font-medium">Display name</span>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        maxLength={60}
                        required
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-500 focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                      />
                    </label>

                    <label className="space-y-1 text-xs text-slate-200">
                      <span className="font-medium">Upload photo</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/bmp"
                        onChange={handleAvatarFileChange}
                        className="mt-1 block w-full text-[0.7rem] text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-100 hover:file:bg-slate-700"
                      />
                      <small className="block text-[0.68rem] text-slate-400">
                        Supported formats: PNG, JPG, GIF, WEBP (max 600KB). Leave empty or clear
                        to keep the default avatar.
                      </small>
                    </label>

                    <div className="space-y-2 text-xs text-slate-200">
                      <span className="font-medium">Preview</span>
                      <div className="flex items-center gap-3">
                        <div className="h-16 w-16 rounded-full bg-slate-800/80 ring-1 ring-white/10">
                          {editAvatarUrl ? (
                            <img
                              src={editAvatarUrl}
                              alt="Avatar preview"
                              className="h-16 w-16 rounded-full object-cover"
                            />
                          ) : avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt="Avatar preview"
                              className="h-16 w-16 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-base font-semibold text-slate-200">
                              {profileInitial}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={clearAvatarSelection}
                          className="text-[0.7rem] font-medium text-rose-300 hover:text-rose-200"
                        >
                          Use default avatar
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-200 md:col-span-2">
                      <span className="font-medium">Streaming services</span>
                      <div className="flex flex-wrap gap-2">
                        {SERVICE_OPTIONS.map((option) => {
                          const isActive = editServices.includes(option.key);
                          return (
                            <button
                              type="button"
                              key={option.key}
                              onClick={() => toggleServiceSelection(option.key)}
                              aria-pressed={isActive}
                              className={
                                isActive
                                  ? "inline-flex items-center rounded-full bg-rose-500/90 px-3 py-1 text-[0.7rem] font-semibold text-white shadow-sm ring-1 ring-rose-300/80"
                                  : "inline-flex items-center rounded-full bg-slate-800/80 px-3 py-1 text-[0.7rem] font-medium text-slate-100 ring-1 ring-white/10 hover:bg-slate-700"
                              }
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                      <small className="block text-[0.68rem] text-slate-400">
                        Pick every platform you actively use so we can personalize your feed.
                      </small>
                    </div>
                  </div>

                  {profileSaveError && (
                    <div className="rounded-md border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-[0.7rem] text-rose-100">
                      {profileSaveError}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={closeEditProfile}
                      disabled={savingProfile}
                      className="rounded-full border border-slate-600/80 px-4 py-1.5 font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="rounded-full bg-rose-500 px-4 py-1.5 font-semibold text-white shadow-sm hover:bg-rose-400 disabled:opacity-60"
                    >
                      {savingProfile ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </form>
              )}
            </section>

            {/* Right column: circles and recent viewings */}
            <div className="w-full space-y-6 lg:w-3/5">
              {/* Circles section */}
              <section className="rounded-2xl bg-slate-900/80 p-5 shadow-xl ring-1 ring-white/5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-50">My circles</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Quick access to the communities you care about most.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/circles")}
                    className="inline-flex items-center rounded-full bg-slate-800/90 px-3 py-1 text-[0.7rem] font-medium text-slate-100 hover:bg-slate-700"
                  >
                    View all
                  </button>
                </div>

                {circlesLoading && (
                  <div className="py-4 text-xs text-slate-400">Loading circles...</div>
                )}
                {circlesError && (
                  <div className="rounded-md border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-[0.7rem] text-rose-100">
                    {circlesError}
                  </div>
                )}
                {!circlesLoading && !circlesError && publicCircles.length === 0 && (
                  <div className="py-4 text-xs text-slate-400">
                    You are not part of any public circles yet.
                  </div>
                )}

                {!circlesLoading && !circlesError && publicCircles.length > 0 && (
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {publicCircles.map((circle) => {
                      const id = getCircleId(circle);
                      if (!id) return null;
                      return (
                        <button
                          type="button"
                          key={id}
                          onClick={() => navigate(`/circles/${id}`)}
                          className="flex items-center justify-between rounded-xl bg-slate-800/80 px-3 py-2 text-left text-xs text-slate-100 ring-1 ring-white/10 transition hover:bg-slate-700 hover:ring-rose-400/80"
                        >
                          <span className="truncate font-medium">
                            {getCircleName(circle)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Viewings section */}
              <section className="rounded-2xl bg-slate-900/80 p-5 shadow-xl ring-1 ring-white/5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-50">
                      Recent viewings
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      A snapshot of the latest titles you have logged.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="inline-flex rounded-full bg-slate-800/90 p-1 text-[0.68rem] font-medium">
                      <button
                        type="button"
                        onClick={() => {
                          if (!viewingsPublic) toggleViewingsVisibility();
                        }}
                        className={
                          viewingsPublic
                            ? "rounded-full bg-slate-950 px-3 py-1 text-slate-50 shadow"
                            : "rounded-full px-3 py-1 text-slate-300 hover:text-slate-50"
                        }
                      >
                        Public
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (viewingsPublic) toggleViewingsVisibility();
                        }}
                        className={
                          !viewingsPublic
                            ? "rounded-full bg-slate-950 px-3 py-1 text-slate-50 shadow"
                            : "rounded-full px-3 py-1 text-slate-300 hover:text-slate-50"
                        }
                      >
                        Private
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate("/viewings")}
                      className="inline-flex items-center rounded-full bg-slate-800/90 px-3 py-1 text-[0.7rem] font-medium text-slate-100 hover:bg-slate-700"
                    >
                      View all
                    </button>
                  </div>
                </div>

                {!viewingsPublic ? (
                  <div className="rounded-xl bg-slate-900/80 px-4 py-6 text-xs text-slate-300">
                    You are keeping your recent viewings private. Toggle back to Public when you
                    are ready to share.
                  </div>
                ) : (
                  <>
                    {viewingsLoading && (
                      <div className="py-4 text-xs text-slate-400">Loading viewings...</div>
                    )}
                    {viewingsError && (
                      <div className="rounded-md border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-[0.7rem] text-rose-100">
                        {viewingsError}
                      </div>
                    )}
                    {!viewingsLoading && !viewingsError && viewings.length === 0 && (
                      <div className="py-4 text-xs text-slate-400">
                        No viewings logged yet.
                      </div>
                    )}

                    {!viewingsLoading && !viewingsError && viewings.length > 0 && (
                      <div className="mt-2 space-y-3">
                        {viewings.map((viewing) => (
                          <article
                            key={viewing._id}
                            className="flex gap-3 rounded-xl bg-slate-900/90 p-3 ring-1 ring-white/5"
                          >
                            <div className="h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-slate-800">
                              {viewing.posterUrl ? (
                                <img
                                  src={viewing.posterUrl}
                                  alt={viewing.displayTitle}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[0.65rem] text-slate-400">
                                  No poster
                                </div>
                              )}
                            </div>

                            <div className="flex flex-1 flex-col justify-between">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h4 className="text-sm font-semibold text-slate-50">
                                    {viewing.displayTitle}
                                  </h4>
                                  {viewing.type && (
                                    <span className="mt-0.5 inline-flex rounded-full bg-slate-800/80 px-2 py-0.5 text-[0.65rem] font-medium text-slate-200">
                                      {formatViewingTypeLabel(viewing.type)}
                                    </span>
                                  )}
                                </div>
                                {viewing.formattedDate && (
                                  <span className="text-[0.7rem] text-slate-400">
                                    {viewing.formattedDate}
                                  </span>
                                )}
                              </div>

                              {viewing.comment && (
                                <p className="mt-2 line-clamp-2 text-[0.75rem] text-slate-200">
                                  {viewing.comment}
                                </p>
                              )}

                              <div className="mt-2 flex items-center justify-between">
                                {viewing.safeRating > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-amber-300">
                                    {Array.from({ length: 5 }).map((_, index) => (
                                      <span
                                        key={index}
                                        className={
                                          index < viewing.safeRating ? "" : "text-slate-600"
                                        }
                                      >
                                        ★
                                      </span>
                                    ))}
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => navigate("/viewings")}
                                  className="text-[0.7rem] font-medium text-rose-300 hover:text-rose-200"
                                >
                                  View details
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
