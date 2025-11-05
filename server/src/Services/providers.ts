
// server/src/services/providers.ts
import TitleCache from "../models/TitleCache";
import tmdb from "../Services/tmdb.service";

/** Your canonical service enum */
const SERVICE_ENUM = ["netflix","hulu","max","prime","disney","peacock"] as const;
export type ServiceCode = typeof SERVICE_ENUM[number];

/** Map TMDb provider names to your enum */
function normalizeProviderName(name: string): ServiceCode | null {
  const n = name.toLowerCase();
  if (n.includes("netflix")) return "netflix";
  if (n === "hulu") return "hulu";
  if (n.includes("hbo") || n === "max") return "max"; // “HBO Max” → “max”
  if (n.includes("prime")) return "prime";            // “Amazon Prime Video”
  if (n.includes("disney")) return "disney";          // “Disney Plus”
  if (n.includes("peacock")) return "peacock";
  return null;
}

const STALE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function getPlayableServicesForTitle(
  type: "movie" | "tv",
  tmdbId: string,
  region = "US"
): Promise<ServiceCode[]> {
  // 1) Try cache
  const cached = await TitleCache.findOne({ tmdbId, type, region }).lean();
  if (cached && cached.updatedAt && Date.now() - cached.updatedAt.getTime() < STALE_MS) {
    return (cached.providers ?? []) as ServiceCode[];
  }

  // 2) Fetch from TMDb
  // Expecting a shape like: { US: { flatrate: [{provider_name: "Netflix"}, ...] } }
  // Adjust if your tmdb service returns a different structure.
  let providers: ServiceCode[] = [];
  try {
    const data = type === "movie" ? await tmdb.getMovieProviders(tmdbId) : await tmdb.getTVProviders(tmdbId);
    const country = data; // tmdb service already returns US territory object
    const lists = [
      ...(country?.flatrate ?? []),
      ...(country?.rent ?? []),
      ...(country?.buy ?? []),
    ];

    const normalized = new Set<ServiceCode>();
    for (const p of lists) {
      const code = normalizeProviderName(String((p as any).provider_name || ""));
      if (code) normalized.add(code);
    }
    providers = Array.from(normalized);
  } catch (err) {
    // If TMDb fails, fall back to stale cache if present
    if (cached && Array.isArray(cached.providers)) {
      return cached.providers as ServiceCode[];
    }
    // else empty
    providers = [];
  }

  // 3) Upsert cache
  await TitleCache.updateOne(
    { tmdbId, type, region },
    { $set: { providers, source: "fresh" } },
    { upsert: true }
  );

  return providers;
}
