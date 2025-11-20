// src/pages/ProfilePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";
import LeftSidebar from "../components/LeftSidebar";
import defaultAvatar from "../assets/default-avatar.svg";
import { apiGet, apiPatch, apiPut } from "../lib/api";
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

type UserResponse = {
  name: string;
  username?: string;
  avatarUrl?: string | null;
};

type StreamingServiceDoc = {
  _id: string;
  name: string;
  tmdbProviderId?: number;
  displayPriority?: number;
  logoPath?: string | null;
};

type StreamingServiceResponse = {
  success: boolean;
  data: StreamingServiceDoc[];
};

type UserStreamingServicesResponse = {
  success: boolean;
  data: StreamingServiceDoc[];
};

const sortServices = (services: StreamingServiceDoc[]) => {
  return [...services].sort((a, b) => {
    const priorityDiff = (b.displayPriority ?? 0) - (a.displayPriority ?? 0);
    if (priorityDiff !== 0) return priorityDiff;
    return a.name.localeCompare(b.name);
  });
};

const MAX_RECENT_VIEWINGS = 3;
const MAX_AVATAR_BYTES = 600 * 1024; // ~600KB
const VIEWINGS_VISIBILITY_KEY = "profile:viewingsVisibility";
const DATA_URL_REGEX = /^data:image\/[a-zA-Z]+;base64,/;
const USERNAME_REGEX = /^[a-z0-9._-]{3,30}$/i;

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
  const [userUsername, setUserUsername] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [userServices, setUserServices] = useState<StreamingServiceDoc[]>([]);
  const [userServicesLoading, setUserServicesLoading] = useState(false);
  const [userServicesError, setUserServicesError] = useState<string | null>(null);
  const [editServiceIds, setEditServiceIds] = useState<string[]>([]);
  const [allServices, setAllServices] = useState<StreamingServiceDoc[]>([]);
  const [allServicesLoading, setAllServicesLoading] = useState(false);
  const [allServicesError, setAllServicesError] = useState<string | null>(null);
  const [serviceSearch, setServiceSearch] = useState("");

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
  const serviceMap = useMemo(() => {
    const map = new Map<string, StreamingServiceDoc>();
    allServices.forEach((svc) => {
      map.set(String(svc._id), svc);
    });
    return map;
  }, [allServices]);

  const popularServices = useMemo(() => sortServices(allServices).slice(0, 8), [allServices]);

  const filteredServices = useMemo(() => {
    const term = serviceSearch.trim().toLowerCase();
    const base = term
      ? allServices.filter((svc) => svc.name.toLowerCase().includes(term))
      : allServices;
    return sortServices(base).slice(0, 20);
  }, [allServices, serviceSearch]);

  const selectedServices = useMemo(
    () =>
      editServiceIds
        .map((id) => serviceMap.get(id))
        .filter((svc): svc is StreamingServiceDoc => Boolean(svc)),
    [editServiceIds, serviceMap]
  );

  const mergeServicesIntoCatalog = (servicesToMerge: StreamingServiceDoc[]) => {
    if (!servicesToMerge.length) return;
    setAllServices((prev) => {
      const merged = new Map<string, StreamingServiceDoc>();
      prev.forEach((svc) => merged.set(String(svc._id), svc));
      let changed = false;
      servicesToMerge.forEach((svc) => {
        const key = String(svc._id);
        if (!merged.has(key)) {
          merged.set(key, svc);
          changed = true;
        }
      });
      return changed ? sortServices(Array.from(merged.values())) : prev;
    });
  };

  useEffect(() => {
    let cancelled = false;
    const fetchAllServices = async () => {
      try {
        setAllServicesLoading(true);
        setAllServicesError(null);
        const res = await apiGet<StreamingServiceResponse>("/api/streaming-services");
        if (cancelled) return;
        const docs = Array.isArray(res?.data) ? res.data : [];
        setAllServices(sortServices(docs));
      } catch (err: any) {
        if (!cancelled) {
          console.error("Failed to load streaming services catalog", err);
          setAllServicesError(
            err.message || "Failed to load streaming services catalog."
          );
        }
      } finally {
        if (!cancelled) {
          setAllServicesLoading(false);
        }
      }
    };

    fetchAllServices();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchUserStreamingServices = async () => {
      try {
        setUserServicesLoading(true);
        setUserServicesError(null);
        const res = await apiGet<UserStreamingServicesResponse>(
          "/api/users/me/streaming-services"
        );
        if (cancelled) return;
        const docs = Array.isArray(res?.data) ? sortServices(res.data) : [];
        setUserServices(docs);
        setEditServiceIds(docs.map((svc) => String(svc._id)));
        mergeServicesIntoCatalog(docs);
      } catch (err: any) {
        if (!cancelled) {
          console.error("Failed to load your streaming services", err);
          setUserServicesError(err.message || "Failed to load streaming services.");
        }
      } finally {
        if (!cancelled) {
          setUserServicesLoading(false);
        }
      }
    };

    fetchUserStreamingServices();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch /me
  useEffect(() => {
    const fetchMe = async () => {
      try {
        setUserLoading(true);
        setUserError(null);
        const res = await apiGet<UserResponse>("/me");
        setUserName(res.name);
        setUserUsername(res.username || "");
        setAvatarUrl(res.avatarUrl || "");
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
    setEditUsername(userUsername);
    setEditAvatarUrl(avatarUrl);
    setEditServiceIds(userServices.map((svc) => String(svc._id)));
    setServiceSearch("");
    setProfileSaveError(null);
  };

  const closeEditProfile = () => {
    setIsEditingProfile(false);
    setProfileSaveError(null);
  };

  const toggleServiceSelection = (serviceId: string) => {
    setEditServiceIds((prev) => {
      const exists = prev.includes(serviceId);
      const next = exists ? prev.filter((id) => id !== serviceId) : [...prev, serviceId];
      const knownDocs = next
        .map((id) => serviceMap.get(id))
        .filter((svc): svc is StreamingServiceDoc => Boolean(svc));
      const ordered = sortServices(knownDocs).map((svc) => String(svc._id));
      const missing = next.filter((id) => !ordered.includes(id));
      return [...ordered, ...missing];
    });
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editName.trim()) {
      setProfileSaveError("Display name is required.");
      return;
    }
    const trimmedUsername = editUsername.trim();
    if (!USERNAME_REGEX.test(trimmedUsername)) {
      setProfileSaveError(
        "Username must be 3-30 characters and can include letters, numbers, dots, dashes, and underscores."
      );
      return;
    }

    try {
      setSavingProfile(true);
      setProfileSaveError(null);
      const profilePayload = {
        name: editName.trim(),
        username: trimmedUsername.toLowerCase(),
        avatarUrl: editAvatarUrl.trim(),
      };

      const streamingPayload = {
        serviceIds: editServiceIds,
      };

      const [updatedProfile, updatedServices] = await Promise.all([
        apiPatch<UserResponse>("/me", profilePayload),
        apiPut<UserStreamingServicesResponse>("/api/users/me/streaming-services", streamingPayload),
      ]);

      setUserName(updatedProfile.name);
      setUserUsername(updatedProfile.username || trimmedUsername.toLowerCase());
      setAvatarUrl(updatedProfile.avatarUrl || "");

      const normalizedServices = Array.isArray(updatedServices?.data)
        ? sortServices(updatedServices.data)
        : [];
      setUserServices(normalizedServices);
      setEditServiceIds(normalizedServices.map((svc) => String(svc._id)));
      mergeServicesIntoCatalog(normalizedServices);
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
                      <div className="mt-1 text-sm text-slate-200">
                        <div className="font-semibold text-base">{userName || "BFFLixer"}</div>
                        {userUsername && (
                          <div className="text-xs text-slate-400">@{userUsername}</div>
                        )}
                      </div>
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
                      {userServicesLoading ? (
                        <p className="text-xs text-slate-400">Loading services...</p>
                      ) : userServicesError ? (
                        <p className="text-xs text-rose-300">{userServicesError}</p>
                      ) : userServices.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {userServices.map((service) => (
                            <span
                              key={service._id}
                              className="inline-flex items-center rounded-full bg-slate-800/80 px-3 py-1 text-[0.7rem] font-medium text-slate-100 ring-1 ring-white/10"
                            >
                              {service.name}
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
                      <span className="font-medium">Username</span>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        maxLength={30}
                        required
                        placeholder="yourname"
                        className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-500 focus:border-rose-400 focus:ring-1 focus:ring-rose-400"
                      />
                      <small className="block text-[0.68rem] text-slate-400">
                        Only letters, numbers, dots, dashes, and underscores. Appears on your invite links.
                      </small>
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

                    <div className="space-y-3 text-xs text-slate-200 md:col-span-2">
                      <span className="font-medium">Streaming services</span>
                      <div className="space-y-3 rounded-xl bg-slate-900/40 p-3">
                        <label className="space-y-1 text-[0.7rem] text-slate-300">
                          <span>Search catalog</span>
                          <input
                            type="search"
                            value={serviceSearch}
                            onChange={(event) => setServiceSearch(event.target.value)}
                            placeholder="Search Netflix, Crunchyroll, Apple TV+, etc."
                            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
                          />
                        </label>

                        {selectedServices.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[0.65rem] uppercase tracking-wide text-slate-400">
                              Selected
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {selectedServices.map((service) => (
                                <button
                                  type="button"
                                  key={`selected-${service._id}`}
                                  onClick={() => toggleServiceSelection(String(service._id))}
                                  aria-label={`Remove ${service.name}`}
                                  className="inline-flex items-center gap-1 rounded-full bg-rose-500/90 px-3 py-1 text-[0.7rem] font-semibold text-white shadow-sm ring-1 ring-rose-300/80 transition hover:bg-rose-400"
                                >
                                  {service.name}
                                  <span aria-hidden="true">×</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-1">
                          <p className="text-[0.65rem] uppercase tracking-wide text-slate-400">
                            Popular choices
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {popularServices.slice(0, 8).map((service) => {
                              const isActive = editServiceIds.includes(String(service._id));
                              return (
                                <button
                                  type="button"
                                  key={`popular-${service._id}`}
                                  onClick={() => toggleServiceSelection(String(service._id))}
                                  aria-pressed={isActive}
                                  className={
                                    isActive
                                      ? "inline-flex items-center rounded-full bg-rose-500/90 px-3 py-1 text-[0.7rem] font-semibold text-white shadow-sm ring-1 ring-rose-300/80"
                                      : "inline-flex items-center rounded-full bg-slate-800/80 px-3 py-1 text-[0.7rem] font-medium text-slate-100 ring-1 ring-white/10 hover:bg-slate-700"
                                  }
                                >
                                  {service.name}
                                </button>
                              );
                            })}
                            {popularServices.length === 0 && !allServicesLoading && (
                              <p className="text-[0.7rem] text-slate-400">
                                No providers found. Try running the TMDB sync script.
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[0.65rem] uppercase tracking-wide text-slate-400">
                            {serviceSearch ? "Search results" : "Browse catalog"}
                          </p>
                          {allServicesLoading ? (
                            <p className="text-[0.7rem] text-slate-400">
                              Loading streaming services...
                            </p>
                          ) : filteredServices.length > 0 ? (
                            <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto pr-1">
                              {filteredServices.map((service) => {
                                const isActive = editServiceIds.includes(String(service._id));
                                return (
                                  <button
                                    type="button"
                                    key={`search-${service._id}`}
                                    onClick={() => toggleServiceSelection(String(service._id))}
                                    aria-pressed={isActive}
                                    className={
                                      isActive
                                        ? "inline-flex items-center rounded-full bg-rose-500/90 px-3 py-1 text-[0.7rem] font-semibold text-white shadow-sm ring-1 ring-rose-300/80"
                                        : "inline-flex items-center rounded-full bg-slate-800/80 px-3 py-1 text-[0.7rem] font-medium text-slate-100 ring-1 ring-white/10 hover:bg-slate-700"
                                    }
                                  >
                                    {service.name}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[0.7rem] text-slate-400">
                              {serviceSearch
                                ? "No providers match your search."
                                : "No providers available yet."}
                            </p>
                          )}
                        </div>

                        {allServicesError && (
                          <p className="text-[0.65rem] text-rose-300">{allServicesError}</p>
                        )}
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
