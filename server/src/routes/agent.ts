
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
import Post from "../models/Post";
import Circle from "../models/Circles/Circle";

const r = Router();

const bodySchema = z.object({
  query: z.string().min(1, "Query is required"),
  limit: z.coerce.number().int().min(1).max(10).optional().default(5), // optional cap for UI
  preferFeed: z.coerce.boolean().optional().default(false),            // feed vs AI ordering

  // NEW: optional conversation context so the agent can handle follow-ups
  conversationId: z.string().max(100).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      })
    )
    .max(15)
    .optional(),
});

// Additional schema for natural-language smart search
const smartSchema = z.object({
  query: z.string().min(1, "Query is required"),
  kind: z.enum(["movie","tv"]).optional(),      // optional user hint
  limit: z.coerce.number().int().min(1).max(10).optional().default(5),
  useFeedBias: z.coerce.boolean().optional().default(false), // optionally blend with pod/feed signal
  preferFeed: z.coerce.boolean().optional().default(false),  // NEW
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
 * Top titles from the user's circles (recent activity), to bias AI suggestions.
 * Looks at posts in the last 30 days, grouped by (tmdbId,type), sorted by count and avg rating.
 */
async function getFeedTopCandidates(userId: string, days = 30, max = 10): Promise<Array<{ tmdbId: string; type: "movie" | "tv" }>> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const circleIds = await Circle.find({ members: userId }).distinct("_id");

  if (!circleIds.length) return [];

  const agg = await Post.aggregate([
    { $match: { circles: { $in: circleIds }, createdAt: { $gte: since } } },
    {
      $group: {
        _id: { tmdbId: "$tmdbId", type: "$type" },
        count: { $sum: 1 },
        avgRating: { $avg: "$rating" },
        lastAt: { $max: "$createdAt" },
      },
    },
    { $sort: { count: -1, avgRating: -1, lastAt: -1 } },
    { $limit: max },
    { $project: { _id: 0, tmdbId: "$_id.tmdbId", type: "$_id.type" } },
  ]);

  return agg as Array<{ tmdbId: string; type: "movie" | "tv" }>;
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

    const { query, kind, limit, useFeedBias, preferFeed } = parsed.data;
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
    let enriched = (
      await Promise.all(picks.map((p) => enrichFromTmdbPick(p, userServices).catch(() => null)))
    ).filter(Boolean);

    // Optionally layer in feed-bias: boost items that are hot in user's circles and playable
    if (useFeedBias) {
      // 1) Fetch recent feed candidates (ids) from circles
      const feedCandidates = await getFeedTopCandidates(userId, 30, limit * 2);
      const feedKeySet = new Set(feedCandidates.map(fc => `${fc.type}:${fc.tmdbId}`));

      // 2) Re-rank current TMDB picks by a simple score
      //    Base: popularity; + big boost if in feed; + small boost if playable on user's services
      const FEED_BOOST = preferFeed ? 10_000_000 : 1_000_000;
      const PLAYABLE_BOOST = preferFeed ? 10_000 : 1_000;
      const scored = (enriched as Array<any>).map(item => {
        const key = `${item.type}:${item.tmdbId}`;
        const inFeed = feedKeySet.has(key);
        const score =
          (typeof item.popularity === "number" ? item.popularity : 0) +
          (inFeed ? FEED_BOOST : 0) +
          (item.playableOnMyServices ? PLAYABLE_BOOST : 0);
        return { item, score, key };
      }).sort((a, b) => b.score - a.score);

      let biased = scored.map(s => s.item);

      // 3) If we still have room or no overlap, backfill with top feed items not already present
      if (biased.length < limit) {
        const present = new Set(scored.map(s => s.key));
        const toAdd = feedCandidates.filter(fc => !present.has(`${fc.type}:${fc.tmdbId}`)).slice(0, limit * 2);
        if (toAdd.length) {
          const backfilled = (
            await Promise.all(
              toAdd.map(async fc => {
                const providers = await getPlayableServicesForTitle(fc.type, fc.tmdbId, "US");
                const playableOn = intersect(providers, userServices);
                const details = fc.type === "movie"
                  ? await tmdb.getMovieDetails(Number(fc.tmdbId)).catch(() => null)
                  : await tmdb.getTVDetails(Number(fc.tmdbId)).catch(() => null);
                if (!details) return null;
                const poster = tmdb.getPosterURL(details.poster_path, "w500");
                return {
                  tmdbId: String(details.id),
                  type: fc.type,
                  title: fc.type === "movie" ? (details.title || details.name) : (details.name || details.title),
                  year: (details.release_date || details.first_air_date || "").slice(0, 4) || null,
                  overview: details.overview ?? null,
                  poster,
                  providers,
                  playableOnMyServices: playableOn.length > 0,
                  playableOn,
                  popularity: details.popularity ?? null,
                  voteAverage: details.vote_average ?? null,
                };
              })
            )
          ).filter(Boolean) as Array<any>;

          // merge and dedupe with optional feed preference
          const seenKeys = new Set(biased.map((it: any) => `${it.type}:${it.tmdbId}`));
          const pushUnique = (arr: any[]) => {
            for (const it of arr) {
              const k = `${it.type}:${it.tmdbId}`;
              if (seenKeys.has(k)) continue;
              biased.push(it);
              seenKeys.add(k);
              if (biased.length >= limit) break;
            }
          };
          if (preferFeed) {
            // when preferring feed, insert backfilled feed items first
            pushUnique(backfilled);
          } else {
            // default behavior: just append as before
            pushUnique(backfilled);
          }
        }
      }

      // 4) Cap to limit
      enriched = biased.slice(0, limit);
    }

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

    const { query, limit, preferFeed, conversationId, history } = parsed.data;
    const userId = req.user!.id;

    // 0) Quick classifier: only handle movie/TV/streaming queries
    const classifyPrompt = `
      You are a classifier for the BFFlix assistant.

      Determine if the user's latest message is about movies, TV shows, streaming, watchlists, recommendations, actors, genres, or where to watch something.
      - If it is about those topics, return: { "isMedia": true }
      - If it is clearly about something else (homework, coding, life advice, general chat, etc.), return: { "isMedia": false }

      Return ONLY a JSON object.

      User message: "${query}"
      `.trim();

    let isMedia = true;
    try {
      const classifyRaw = await askLLMJson(classifyPrompt);
      if (
        classifyRaw &&
        typeof classifyRaw === "object" &&
        Object.prototype.hasOwnProperty.call(classifyRaw, "isMedia") &&
        typeof (classifyRaw as any).isMedia === "boolean"
      ) {
        isMedia = (classifyRaw as any).isMedia;
      }
    } catch (e) {
      // If classifier fails, default to media = true so we don't block legit queries
      isMedia = true;
    }

    if (!isMedia) {
      return res.json({
        query,
        cached: false,
        basedOn: 0,
        platforms: [],
        results: [
          {
            type: "conversation",
            message:
              "I’m your BFFlix assistant, so I can only help with movie and TV show discovery, recommendations, and availability. Try asking about films, series, or what to watch next.",
          },
        ],
      });
    }

    const isStateless = !conversationId && !(history && history.length);

    // 1) Check cache (caching enriched results) — only for stateless calls
    let cached: any = null;
    if (isStateless) {
      cached = await RecommendationCache.findOne({ userId, query }).lean();
      if (cached && cached.expiresAt > new Date()) {
        return res.json({
          query,
          cached: true,
          results: cached.results,
          message: "Served from cache",
        });
      }
    }

    // 2) Get recent viewings (limit = 10)
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

    // 4) Fallback path if no history at all
    if (recentViewings.length === 0) {
      const fallbackPrompt = `
  You are the BFFlix assistant.

  The user has no viewing history recorded yet, so keep the tone warm and conversational.

  Write one short, friendly message (1–2 sentences) that:
  - Explains you have not logged anything they have watched yet.
  - Asks one clear follow-up question.
  - Offers two options, phrased naturally, for what they would like next:
    1) Getting a few of the most popular movies or shows people are watching right now.
    2) Getting a short list based on a genre they like (for example comedy, sci fi, drama).

  If applicable, you may casually mention their platforms: ${platformNames.join(", ") || "no streaming services saved yet"}.

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
                message:
                  "I don’t see anything in your history yet. Want trending picks or a short list by genre?",
              },
        ],
      });
    }

    // 5) Build an enriched user profile from viewings using TMDB titles
    const profileLines = await Promise.all(
      recentViewings.map(async (v) => {
        try {
          const isTv = v.type === "tv";
          const details = isTv
            ? await tmdb.getTVDetails(Number(v.tmdbId)).catch(() => null)
            : await tmdb.getMovieDetails(Number(v.tmdbId)).catch(() => null);

          const title =
            details?.title ||
            details?.name ||
            `TMDB id ${String(v.tmdbId)}`;
          const year =
            (details?.release_date || details?.first_air_date || "").slice(
              0,
              4
            ) || null;

          const parts: string[] = [];
          parts.push(
            `${isTv ? "TV Show" : "Movie"}: ${title}${
              year ? ` (${year})` : ""
            }`
          );

          if (v.seasonNumber != null && v.episodeNumber != null) {
            parts.push(`season ${v.seasonNumber}, episode ${v.episodeNumber}`);
          }
          if (v.rating != null) {
            parts.push(`rated ${v.rating}/5`);
          }
          if (v.comment) {
            parts.push(
              `comment "${String(v.comment).replace(/"/g, "'")}"`
            );
          }

          return parts.join(", ");
        } catch {
          // Fallback if TMDB fails
          const parts: string[] = [];
          parts.push(
            `${v.type === "tv" ? "TV Show" : "Movie"} id ${String(v.tmdbId)}`
          );
          if (v.rating != null) parts.push(`rated ${v.rating}/5`);
          if (v.comment) {
            parts.push(
              `comment "${String(v.comment).replace(/"/g, "'")}"`
            );
          }
          return parts.join(", ");
        }
      })
    );

    const userProfile = profileLines.filter(Boolean).join("; ");

    // 6) Compose LLM prompt with platforms + profile + optional conversation history
    const historyBlock =
      history && history.length
        ? `Prior conversation:\n${history
            .map((m) =>
              m.role === "user"
                ? `User: ${m.content}`
                : `Assistant: ${m.content}`
            )
            .join("\n")}\n\n`
        : "";

    const llmPrompt = `
  You are the AI movie assistant for BFFlix. Talk like a friendly human, not a robot.

  User platforms (prefer titles likely available here when it makes sense): ${
    platformNames.join(", ") || "none set"
  }.

  Recent viewing history (most recent first):
  ${userProfile || "No recent titles recorded."}

  ${historyBlock}User's latest message: "${query}"

  Your goals:
  1) Treat this as a real conversation, especially if prior history exists.
  2) Lean heavily on the viewing history above to understand the user's taste:
     - What genres and tones they like.
     - Whether they gravitate toward modern or older titles.
     - Whether they like high-energy action, light rom coms, darker stories, etc.
  3) Use their platforms when helpful, but do not force it for every title.

  When you recommend titles:
  - For the **first recommendation only**, start the **reason** with a short conversational intro that directly responds to the user's latest message. For example:
    - "A rom com with some action is a fun mood, so first up..."
    - "Since you're asking for something lighter than what you've watched recently..."
  - For at least the first **two** items, explicitly connect the recommendation to their viewing history by name, for example:
    - "Because you loved The Matrix..."
    - "Since you rated Anyone But You so highly..."
  - If the user says things like "I don't like those", "what about this movie?", "got anything lighter?", or "none of those work", you must ADAPT the new list so it clearly reacts to that feedback. Do NOT repeat the same style of list.

  Style:
  - Imagine you are texting a friend about what to watch.
  - Keep each reason to 1–2 short, conversational sentences.
  - Vary sentence structure and wording so the reasons do not sound templated.
  - Avoid repeating the same stock phrase like "Since you liked..." for every item.
  - Avoid extremely generic phrases like "This movie is about..." at the start of every reason.

  Output format:
  Return ONLY a JSON array with items like:
  [
    { "title": "string", "type": "movie" | "tv", "reason": "string", "matchScore": number }
  ]
  `.trim();

    // 6.1) Pull popular items from the user's circles to bias/merge with AI output
    const feedCandidates = await getFeedTopCandidates(userId, 30, limit * 2);

    // 7) Call LLM and cap to limit
    const raw = await askLLMJson(llmPrompt);
    const llmArray = Array.isArray(raw) ? raw : [];
    const trimmed = llmArray.slice(0, limit);

    // Build arrays separately
    const aiCandidates: Array<{
      title: string;
      type?: "movie" | "tv";
      reason?: string;
      matchScore?: number;
    }> = [];
    for (const it of trimmed) {
      const payload: {
        title: string;
        type?: "movie" | "tv";
        reason?: string;
        matchScore?: number;
      } = {
        title: String(it?.title || ""),
      };
      if (it?.type === "tv" || it?.type === "movie") payload.type = it.type;
      if (typeof it?.reason === "string") payload.reason = it.reason;
      if (typeof it?.matchScore === "number") payload.matchScore = it.matchScore;
      aiCandidates.push(payload);
    }

    const feedIdCandidates: Array<{ tmdbId: string; type: "movie" | "tv" }> =
      feedCandidates.map((f) => ({ tmdbId: f.tmdbId, type: f.type }));

    // Order depends on preferFeed
    const merged: Array<{
      title?: string;
      type?: "movie" | "tv";
      reason?: string;
      matchScore?: number;
      tmdbId?: string;
    }> = preferFeed
      ? [...feedIdCandidates, ...aiCandidates]
      : [...aiCandidates, ...feedIdCandidates];

    // 8) Enrich all candidates:
    //  - If we have a title (AI), resolve via search and enrich
    //  - If we already have tmdbId+type (feed), enrich directly without search
    const enriched = (
      await Promise.all(
        merged.map(async (cand) => {
          if (cand.tmdbId && cand.type) {
            // direct enrich from known id/type
            const providers = await getPlayableServicesForTitle(
              cand.type,
              cand.tmdbId,
              "US"
            );
            const playableOn = intersect(providers, userServices);
            const details =
              cand.type === "movie"
                ? await tmdb
                    .getMovieDetails(Number(cand.tmdbId))
                    .catch(() => null)
                : await tmdb
                    .getTVDetails(Number(cand.tmdbId))
                    .catch(() => null);

            if (!details) return null;

            const poster = tmdb.getPosterURL(details.poster_path, "w500");
            return {
              tmdbId: String(details.id),
              type: cand.type,
              title:
                cand.type === "movie"
                  ? details.title || details.name
                  : details.name || details.title,
              year:
                (details.release_date || details.first_air_date || "").slice(
                  0,
                  4
                ) || null,
              overview: details.overview ?? null,
              poster,
              providers,
              playableOnMyServices: playableOn.length > 0,
              playableOn,
              reason: cand.reason ?? null,
              matchScore:
                typeof cand.matchScore === "number"
                  ? cand.matchScore
                  : null,
              popularity: details.popularity ?? null,
              voteAverage: details.vote_average ?? null,
            };
          } else if (cand.title) {
            const input = {
              title: cand.title as string,
              ...(cand.type ? { type: cand.type as "movie" | "tv" } : {}),
              ...(typeof cand.reason === "string"
                ? { reason: cand.reason }
                : {}),
              ...(typeof cand.matchScore === "number"
                ? { matchScore: cand.matchScore }
                : {}),
            };
            return resolveAndEnrich(input, userServices).catch(() => null);
          }
          return null;
        })
      )
    ).filter(Boolean) as Array<any>;

    // Deduplicate by (type, tmdbId) keeping the first occurrence (AI-priority, then feed)
    const seen = new Set<string>();
    const deduped: any[] = [];
    for (const item of enriched) {
      const key = `${item.type}:${item.tmdbId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }

    // Now cap to `limit` after merging
    const finalResults = deduped.slice(0, limit);

    // If nothing could be resolved, return a friendly fallback
    if (finalResults.length === 0) {
      return res.json({
        query,
        cached: false,
        basedOn: recentViewings.length,
        platforms: platformNames,
        results: [
          {
            type: "conversation",
            message:
              "I couldn't resolve those picks. Want trending suggestions or a short list by genre instead?",
          },
        ],
      });
    }

    // 9) Save enriched to cache for 6 hours (only for stateless calls)
    if (isStateless) {
      await RecommendationCache.findOneAndUpdate(
        { userId, query },
        {
          userId,
          query,
          results: finalResults,
          expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
        },
        { upsert: true }
      );
    }

    res.json({
      query,
      cached: false,
      basedOn: recentViewings.length,
      platforms: platformNames,
      results: finalResults,
    });
  } catch (err) {
    console.error("Agent Error:", err);
    res.status(500).json({ error: "agent_failed" });
  }
});

export default r;