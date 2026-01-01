// mobile/src/types/feed.ts

export type FeedPost = {
  id: string;
  authorId?: string;
  authorName: string;
  authorAvatarUrl?: string;
  circleNames: string[];
  createdAt: string;
  title: string;
  year?: number;
  type: "Movie" | "Show";
  mediaType?: "movie" | "tv";
  tmdbId?: string;
  rating: number;
  body: string;
  services: string[];
  likeCount: number;
  commentCount: number;
  likedByMe?: boolean;
  imageUrl?: string;
};

export type FeedResponse = {
  items: FeedPost[];
  nextCursor?: string | null;
};

export type FeedComment = {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
};

export type CommentsResponse = {
  items: FeedComment[];
};

export type Circle = {
  id: string;
  name: string;
  description?: string;
  visibility?: string;
  createdBy?: string;
  membersCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CirclesResponse = {
  page: number;
  limit: number;
  items: Circle[];
};

export type TmdbSearchResult = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
};

export type TmdbSearchResponse = {
  results: TmdbSearchResult[];
  page: number;
  total_pages: number;
  total_results: number;
};

export type CreatePostPayload = {
  type: "movie" | "tv";
  tmdbId: string;
  circles: string[];
  rating?: number;
  comment?: string;
  watchedAt?: string;
  seasonNumber?: number;
  episodeNumber?: number;
};

export type FeedScope = "all" | "circles" | "mine";
export type FeedSort = "latest" | "smart";
export type ServiceTag =
  | "Netflix"
  | "Hulu"
  | "Prime Video"
  | "Disney+"
  | "Max"
  | "Apple TV+"
  | "All services";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
};
