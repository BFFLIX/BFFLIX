// client/src/lib/TMDBService.ts
const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const TMDB_API_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w342";

if (!TMDB_API_KEY) {
  console.warn(
    "[TMDB] VITE_TMDB_API_KEY is not set. TMDB search / posters will not work."
  );
}

export type TmdbTitleOption = {
  id: number;
  label: string;
  posterUrl?: string;
  type: "movie" | "tv";
  year?: number;
};

/**
 * Search TMDB for movies or TV shows by text.
 */
export async function searchTmdbTitles(
  query: string,
  type: "movie" | "tv"
): Promise<TmdbTitleOption[]> {
  if (!TMDB_API_KEY) return [];

  const url = `${TMDB_API_BASE}/search/${type}?api_key=${TMDB_API_KEY}&language=en-US&include_adult=false&page=1&query=${encodeURIComponent(
    query
  )}`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error("[TMDB] search error", res.status, res.statusText);
    return [];
  }

  const data = await res.json();
  const results = Array.isArray(data.results) ? data.results : [];

  return results.map((r: any) => {
    const title =
      type === "movie"
        ? r.title || r.name || "Untitled"
        : r.name || r.title || "Untitled";

    const posterUrl = r.poster_path
      ? `${TMDB_IMAGE_BASE}${r.poster_path}`
      : undefined;

    const rawDate: string | undefined =
      type === "movie" ? r.release_date : r.first_air_date;

    const year = rawDate && typeof rawDate === "string" && rawDate.length >= 4
      ? Number.parseInt(rawDate.slice(0, 4), 10)
      : undefined;

    return {
      id: r.id,
      label: title,
      posterUrl,
      type,
      year,
    } as TmdbTitleOption;
  });
}

/**
 * Fetch a single title (movie or TV) by TMDB id, used to enrich viewings.
 */
export async function fetchTmdbTitleDetails(
  tmdbId: string,
  type: "movie" | "tv"
): Promise<{ title: string; posterUrl?: string; year?: number }> {
  if (!TMDB_API_KEY) {
    return {
      title: "Unknown title (no TMDB key)",
    };
  }

  const url = `${TMDB_API_BASE}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`;

  const res = await fetch(url);
  if (!res.ok) {
    console.error("[TMDB] details error", res.status, res.statusText);
    return {
      title: `TMDB #${tmdbId}`,
    };
  }

  const data = await res.json();
  const title =
    type === "movie"
      ? data.title || data.name || `TMDB #${tmdbId}`
      : data.name || data.title || `TMDB #${tmdbId}`;

  const posterUrl = data.poster_path
    ? `${TMDB_IMAGE_BASE}${data.poster_path}`
    : undefined;

  const rawDate: string | undefined =
    type === "movie" ? data.release_date : data.first_air_date;

  const year = rawDate && typeof rawDate === "string" && rawDate.length >= 4
    ? Number.parseInt(rawDate.slice(0, 4), 10)
    : undefined;

  return { title, posterUrl, year };
}