
// server/src/routes/agent.ts
import { Router } from "express";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import Viewing from "../models/Viewing";
import RecommendationCache from "../models/RecommendationCache";
import UserStreamingService from "../models/UserStreamingService";
import { askLLMJson } from "../lib/llm";
import tmdb from "../Services/tmdb.service";
import { getPlayableServicesForTitle } from "../Services/providers";

const r = Router();

const bodySchema = z.object({
  query: z.string().min(1, "Query is required"),
  limit: z.coerce.number().int().min(1).max(10).optional().default(5), // optional cap for UI
});

// Additional schema for natural-language smart search
const smartSchema = z.object({
  query: z.string().min(1, "Query is required"),
  kind: z.enum(["movie","tv"]).optional(),      // optional user hint
  limit: z.coerce.number().int().min(1).max(10).optional().default(5),
});

// Enrich a known TMDb pick (already has media_type/id)
async function enrichFromTmdbPick(
  pick: any,
  userServices: ServiceCode[]
) {
  if (!pick || (!pick.id && !pick.tmdbId)) return null;

  const resolvedType: "movie" | "tv" = pick.media_type === "tv" ? "tv" : "movie";
  const tmdbId = String(pick.id ?? pick.tmdbId);

  const providers = await getPlayableServicesForTitle(resolvedType, tmdbId, "US");
  const playableOn = intersect(providers, userServices);
  const poster = tmdb.getPosterURL(pick.poster_path, "w500");

  return {
    tmdbId,
    type: resolvedType,
    title: resolvedType === "movie" ? (pick.title || pick.name) : (pick.name || pick.title),
    year: (pick.release_date || pick.first_air_date || "").slice(0, 4) || null,
    overview: pick.overview ?? null,
    poster,
    providers,
    playableOnMyServices: playableOn.length > 0,
    playableOn,
    popularity: pick.popularity ?? null,
    voteAverage: pick.vote_average ?? null,
  };
}

// --- helpers -------------------------------------------------------------

/** Canonical enum used across the codebase */
const SERVICE_ENUM = ["netflix","hulu","max","prime","disney","peacock"] as const;
type ServiceCode = typeof SERVICE_ENUM[number];

function normalizeServiceName(name: string): ServiceCode | null {
  const n = name.trim().toLowerCase();
  if (n.includes("netflix")) return "netflix";
  if (n === "hulu") return "hulu";
  if (n === "max" || n.includes("hbo")) return "max";
  if (n.includes("prime") || n.includes("amazon")) return "prime";
  if (n.includes("disney")) return "disney";
  if (n.includes("peacock")) return "peacock";
  return null;
}

/** Intersect two arrays */
function intersect<T>(a: T[], b: T[]): T[] {
  const set = new Set(b);
  return a.filter((x) => set.has(x));
}

/**
 * Given a { title, type } pair from LLM, resolve to TMDb { id, type } and add
 * poster + providers + playableOnMyServices.
 */
async function resolveAndEnrich(
  item: { title: string; type?: "movie" | "tv"; reason?: string; matchScore?: number },
  userServices: ServiceCode[]
) {
  const q = item.title?.trim();
  if (!q) return null;

  // Prefer the hinted type if present
  const resp = await tmdb.searchMulti(q, 1);
  const candidates = Array.isArray(resp?.results) ? resp.results : [];

  // Try to pick the best match
  let pick: any | null = null;
  if (item.type === "movie") {
    pick = candidates.find((c: any) => c.media_type === "movie");
  } else if (item.type === "tv") {
    pick = candidates.find((c: any) => c.media_type === "tv");
  }
  if (!pick) {
    // fallback: first reasonable result
    pick = candidates.find((c: any) => c.media_type === "movie" || c.media_type === "tv") || null;
  }
  if (!pick) return null;

  const resolvedType: "movie" | "tv" = pick.media_type === "tv" ? "tv" : "movie";
  const tmdbId = String(pick.id);

  // Providers (cached via TitleCache; gracefully handles TMDb hiccups)
  const providers = await getPlayableServicesForTitle(resolvedType, tmdbId, "US");
  const playableOn = intersect(providers, userServices);

  // Poster
  const poster = tmdb.getPosterURL(pick.poster_path, "w500");

  return {
    tmdbId,
    type: resolvedType,
    title: resolvedType === "movie" ? (pick.title || item.title) : (pick.name || item.title),
    year: (pick.release_date || pick.first_air_date || "").slice(0, 4) || null,
    overview: pick.overview ?? null,
    poster,
    providers,                       // all platforms (normalized to your enum)
    playableOnMyServices: playableOn.length > 0,
    playableOn,                      // subset of user’s platforms
    reason: item.reason ?? null,
    matchScore: typeof item.matchScore === "number" ? item.matchScore : null,
    popularity: pick.popularity ?? null,
    voteAverage: pick.vote_average ?? null,
  };
}

r.post("/smart-search", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const parsed = smartSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.format());

    const { query, kind, limit } = parsed.data;
    const userId = req.user!.id;

    // Get user's subscribed platforms (names) then normalize to enum
    const userServicesDocs = await UserStreamingService.find({ userId })
      .populate("streamingServiceId", "name")
      .lean();

    const platformNames: string[] = userServicesDocs
      .map((u: any) => u.streamingServiceId?.name)
      .filter(Boolean);

    const userServices: ServiceCode[] = Array.from(
      new Set(
        platformNames
          .map((n) => normalizeServiceName(String(n) || ""))
          .filter((v): v is ServiceCode => !!v)
      )
    );

    // Ask LLM to extract intent in a strict JSON format
    const intentPrompt = `
Extract structured search intent from the user's natural language about movies/TV.
Return ONLY a JSON object with the following optional fields (omit unknowns):
{
  "kind": "movie" | "tv",
  "genre": "string",              // normalized English name if present
  "minYear": number,
  "maxYear": number,
  "sortBy": "popularity.desc" | "vote_average.desc" | "primary_release_date.desc" | "first_air_date.desc"
}
User query: "${query}"
`.trim();

    const intentRaw = await askLLMJson(intentPrompt);
    const intent = typeof intentRaw === "object" && intentRaw ? intentRaw as any : {};
    const resolvedKind: "movie" | "tv" = intent.kind === "tv" || intent.kind === "movie" ? intent.kind : (kind || "movie");

    // Resolve genre id if provided
    let genreId: number | null = null;
    if (typeof intent.genre === "string" && intent.genre.trim()) {
      genreId = await tmdb.resolveGenreId(resolvedKind, intent.genre.trim());
    }

    // Build TMDb params and fetch items
    let picks: any[] = [];
    if (genreId != null) {
      const page1 = await tmdb.discoverByGenre(resolvedKind, genreId, 1);
      picks = page1?.results ?? [];
    } else {
      // No clear genre — show trending as a friendly default
      const trending = await tmdb.getTrending(resolvedKind, "day");
      picks = trending?.results ?? [];
    }

    // Apply simple year filters client-side if LLM provided them
    const minYear = Number.isFinite(intent.minYear) ? Number(intent.minYear) : undefined;
    const maxYear = Number.isFinite(intent.maxYear) ? Number(intent.maxYear) : undefined;
    if (minYear || maxYear) {
      const yearOf = (p: any) => Number((p.release_date || p.first_air_date || "").slice(0, 4)) || 0;
      picks = picks.filter((p) => {
        const y = yearOf(p);
        if (minYear && y < minYear) return false;
        if (maxYear && y > maxYear) return false;
        return true;
      });
    }

    // Trim to limit
    picks = picks.slice(0, limit);

    // Enrich with providers + playable flags
    const enriched = (
      await Promise.all(picks.map((p) => enrichFromTmdbPick(p, userServices).catch(() => null)))
    ).filter(Boolean);

    return res.json({
      query,
      kind: resolvedKind,
      platforms: platformNames,
      results: enriched,
    });
  } catch (err) {
    console.error("Smart-search Error:", err);
    return res.status(500).json({ error: "smart_search_failed" });
  }
});

// POST /agent/recommendations
r.post("/recommendations", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error.format());

    const { query, limit } = parsed.data;
    const userId = req.user!.id;

    // 1) Check cache (now caching *enriched* results so UI is instant)
    const cached = await RecommendationCache.findOne({ userId, query }).lean();
    if (cached && cached.expiresAt > new Date()) {
      return res.json({
        query,
        cached: true,
        results: cached.results,
        message: "Served from cache",
      });
    }

    // 2) Get recent viewings
    const recentViewings = await Viewing.find({ userId })
      .sort({ watchedAt: -1, _id: -1 })
      .limit(10)
      .lean();

    // 3) Get user's subscribed platforms (names) then normalize to enum
    const userServicesDocs = await UserStreamingService.find({ userId })
      .populate("streamingServiceId", "name")
      .lean();

    const platformNames: string[] = userServicesDocs
      .map((u: any) => u.streamingServiceId?.name)
      .filter(Boolean);

    const userServices: ServiceCode[] = Array.from(
      new Set(
        platformNames
          .map((n) => normalizeServiceName(String(n) || ""))
          .filter((v): v is ServiceCode => !!v)
      )
    );

    // 4) Fallback path if no history
    if (recentViewings.length === 0) {
      const fallbackPrompt = `
The user has no recent viewing history.
Ask one short follow-up question (1–2 sentences). Offer two options:
1) "Want the current most popular movies people are watching across all platforms?"
2) "Prefer a top list by a specific genre you like (for example comedy, sci fi, drama)?"
If applicable, mention their platforms: ${platformNames.join(", ") || "none set"}.
Return JSON object:
{ "type": "conversation", "message": "string" }
`.trim();

      const fallback = await askLLMJson(fallbackPrompt);

      return res.json({
        query,
        results: [
          typeof fallback === "string"
            ? { type: "conversation", message: fallback }
            : fallback || {
                type: "conversation",
                message: "Want trending now or a top list by genre?",
              },
        ],
      });
    }

    // 5) Build a compact user profile from viewings
    const userProfile = recentViewings
      .map((v) => {
        const parts: string[] = [];
        parts.push(`${v.type === "tv" ? "TV Show" : "Movie"} id ${v.tmdbId}`);
        if (v.seasonNumber != null && v.episodeNumber != null) {
          parts.push(`S${v.seasonNumber}E${v.episodeNumber}`);
        }
        if (v.rating != null) parts.push(`rated ${v.rating}/5`);
        if (v.comment) parts.push(`comment "${String(v.comment).replace(/"/g, "'")}"`);
        return parts.join(", ");
      })
      .join("; ");

    // 6) Compose LLM prompt with platforms + profile
    const llmPrompt = `
You are the AI movie assistant for BFFlix.

User platforms (prefer titles likely available here): ${platformNames.join(", ") || "none set"}.

Recent viewing history (most recent first):
${userProfile}

User query: "${query}"

Generate 3 to 5 high quality personalized recommendations. Infer tone, genre, and runtime preferences from their ratings and comments. Return ONLY a JSON array with items like:
[
  { "title": "string", "type": "movie" | "tv", "reason": "string", "matchScore": number }
]
`.trim();

    // 7) Call LLM and cap to limit
    const raw = await askLLMJson(llmPrompt);
    const llmArray = Array.isArray(raw) ? raw : [];
    const trimmed = llmArray.slice(0, limit);

    // 8) Resolve to TMDb and enrich with providers + poster + playableOnMyServices
    const enriched = (
      await Promise.all(
        trimmed.map((it: any) => {
          const payload: { title: string; type?: "movie" | "tv"; reason?: string; matchScore?: number } = {
            title: String(it?.title || "")
          };
          if (it?.type === "tv" || it?.type === "movie") {
            payload.type = it.type;
          }
          if (typeof it?.reason === "string") {
            payload.reason = it.reason;
          }
          if (typeof it?.matchScore === "number") {
            payload.matchScore = it.matchScore;
          }
          return resolveAndEnrich(payload, userServices).catch(() => null);
        })
      )
    ).filter(Boolean);

    // If nothing could be resolved, return a friendly fallback
    if (enriched.length === 0) {
      return res.json({
        query,
        cached: false,
        basedOn: recentViewings.length,
        platforms: platformNames,
        results: [
          { type: "conversation", message: "I couldn't resolve those picks. Want trending or a genre top list?" }
        ],
      });
    }

    // 9) Save enriched to cache for 6 hours
    await RecommendationCache.findOneAndUpdate(
      { userId, query },
      {
        userId,
        query,
        results: enriched,
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      },
      { upsert: true }
    );

    res.json({
      query,
      cached: false,
      basedOn: recentViewings.length,
      platforms: platformNames,
      results: enriched,
    });
  } catch (err) {
    console.error("Agent Error:", err);
    res.status(500).json({ error: "agent_failed" });
  }
});

export default r;