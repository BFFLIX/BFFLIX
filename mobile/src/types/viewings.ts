// mobile/src/types/viewings.ts

export type Viewing = {
  id: string;
  userId: string;
  type: "movie" | "tv";
  tmdbId: string;
  seasonNumber?: number;
  episodeNumber?: number;
  rating?: number; // 1-5
  comment?: string; // max 1000 chars
  watchedAt: string; // ISO date
  createdAt: string;
  updatedAt: string;

  // TMDB-enriched (client-side)
  title?: string;
  posterUrl?: string;
  year?: number;
  genres?: Array<{ id: number; name: string }>;
};

export type ViewingsResponse = {
  items: Viewing[];
  nextCursor?: string | null;
  hasMore: boolean;
  limit: number;
  sort: "asc" | "desc";
};

export type CreateViewingPayload = {
  type: "movie" | "tv";
  tmdbId: string;
  rating?: number;
  comment?: string;
  watchedAt?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  idemKey?: string; // idempotency key
};

export type ViewingStats = {
  total: number;
  movies: number;
  shows: number;
  notes: number;
};

export type ViewingFilterType = "all" | "movie" | "tv";
export type ViewingSortOrder = "newest" | "oldest";

export type GenreGroup = {
  genreId: number;
  genreName: string;
  viewings: Viewing[];
};
