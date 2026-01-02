// mobile/src/lib/feed.ts

import { apiJson, apiFetch } from "./api";
import type {
  FeedResponse,
  FeedPost,
  FeedComment,
  CommentsResponse,
  Circle,
  CirclesResponse,
  CreatePostPayload,
  TmdbSearchResult,
  TmdbSearchResponse,
  FeedScope,
  FeedSort,
  ServiceTag,
  CurrentUser,
} from "../types/feed";

// ============================================================
// FEED OPERATIONS
// ============================================================

export async function fetchFeed(params: {
  scope?: FeedScope;
  sort?: FeedSort;
  service?: string;
  cursor?: string;
  limit?: number;
}): Promise<FeedResponse> {
  const {
    scope = "all",
    sort = "smart",
    service,
    cursor,
    limit = 20,
  } = params;

  const queryParams = new URLSearchParams({
    scope,
    sort,
    limit: limit.toString(),
  });

  if (service && service !== "All services") {
    queryParams.append("service", service);
  }

  if (cursor) {
    queryParams.append("cursor", cursor);
  }

  return apiJson<FeedResponse>(`/feed?${queryParams.toString()}`);
}

// ============================================================
// POST OPERATIONS
// ============================================================

export async function createPost(
  payload: CreatePostPayload
): Promise<FeedPost> {
  return apiJson<FeedPost>("/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deletePost(postId: string): Promise<void> {
  await apiFetch(`/posts/${postId}`, {
    method: "DELETE",
  });
}

export async function likePost(postId: string): Promise<{ liked: boolean }> {
  return apiJson<{ liked: boolean }>(`/posts/${postId}/like`, {
    method: "POST",
  });
}

export async function unlikePost(postId: string): Promise<{ liked: boolean }> {
  return apiJson<{ liked: boolean }>(`/posts/${postId}/like`, {
    method: "DELETE",
  });
}

// ============================================================
// COMMENT OPERATIONS
// ============================================================

export async function fetchComments(
  postId: string,
  limit = 50
): Promise<FeedComment[]> {
  const response = await apiJson<any>(
    `/posts/${postId}/comments?limit=${limit}`
  );
  const items = response.items || [];

  // Transform backend response (_id -> id)
  return items.map((item: any) => ({
    id: String(item._id || item.id),
    userId: String(item.userId),
    text: item.text,
    createdAt: item.createdAt,
  }));
}

export async function addComment(
  postId: string,
  text: string
): Promise<{ id: string; createdAt: string }> {
  // Backend only returns { id, createdAt }
  return apiJson<{ id: string; createdAt: string }>(`/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function deleteComment(
  postId: string,
  commentId: string
): Promise<void> {
  await apiFetch(`/posts/${postId}/comments/${commentId}`, {
    method: "DELETE",
  });
}

// ============================================================
// TMDB SEARCH
// ============================================================

export async function searchTMDB(
  query: string,
  page = 1
): Promise<TmdbSearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  const queryParams = new URLSearchParams({
    query: query.trim(),
    page: page.toString(),
  });

  const response = await apiJson<TmdbSearchResponse>(
    `/tmdb/search?${queryParams.toString()}`
  );

  return response.results || [];
}

// ============================================================
// CIRCLES
// ============================================================

export async function fetchCircles(): Promise<Circle[]> {
  const response = await apiJson<CirclesResponse>("/circles");
  return response.items || [];
}

// ============================================================
// USER
// ============================================================

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const response = await apiJson<any>("/me");

  // Transform backend response (_id -> id)
  return {
    id: String(response._id || response.id),
    name: response.name,
    email: response.email,
    avatarUrl: response.avatarUrl,
  };
}
