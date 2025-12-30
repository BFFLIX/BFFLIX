// mobile/src/lib/api.ts

import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "./tokenStore";

// Put your Render backend here for now
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || "https://bfflix.onrender.com").replace(/\/+$/, "");

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 20000;

function withTimeout(timeoutMs: number | undefined) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(id),
  };
}

export class ApiError extends Error {
  status: number;
  payload: any;

  constructor(message: string, status: number, payload: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function ensurePath(path: string) {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

let refreshPromise: Promise<string | null> | null = null;

async function readJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  // Prevent multiple refreshes at once
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const t = withTimeout(DEFAULT_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(`${API_BASE_URL}${ensurePath("/auth/refresh")}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          // adjust this body to match your backend refresh contract
          body: JSON.stringify({ refreshToken }),
          signal: t.signal,
        });
      } catch {
        await clearTokens();
        return null;
      } finally {
        t.clear();
      }

      if (!res.ok) {
        // If refresh fails, tokens are no longer trustworthy
        await clearTokens();
        return null;
      }

      const data = await readJsonSafe(res);

      // adjust these keys to match what your backend returns
      const newAccess = data?.accessToken;
      const newRefresh = data?.refreshToken;

      if (!newAccess) {
        await clearTokens();
        return null;
      }

      // Rotation: backend should return BOTH accessToken + refreshToken
      if (!newRefresh) {
        await clearTokens();
        return null;
      }

      await setTokens(newAccess, newRefresh);
      return newAccess as string;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function apiFetch(path: string, options: RequestOptions = {}) {
  const url = `${API_BASE_URL}${ensurePath(path)}`;
  const headers = new Headers(options.headers || {});

  if (!options.skipAuth) {
    const access = await getAccessToken();
    if (access) headers.set("Authorization", `Bearer ${access}`);
  }

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  headers.set("Accept", "application/json");

  const t = withTimeout(options.timeoutMs);

  let first: Response;
  try {
    first = await fetch(url, { ...options, headers, signal: t.signal });
  } catch (e: any) {
    const msg = e?.name === "AbortError" ? "request_timeout" : "network_error";
    throw new ApiError(msg, 0, { message: e?.message || String(e) });
  } finally {
    t.clear();
  }

  // If unauthorized, try refresh once then retry
  if (first.status === 401 && !options.skipAuth) {
    const newAccess = await refreshAccessToken();
    if (!newAccess) return first;

    const retryHeaders = new Headers(headers);
    retryHeaders.set("Authorization", `Bearer ${newAccess}`);

    const retry = await fetch(url, { ...options, headers: retryHeaders });
    if (retry.status === 401) {
      await clearTokens();
    }
    return retry;
  }

  return first;
}

export async function apiJson<T>(path: string, options: RequestOptions = {}) {
  const res = await apiFetch(path, options);
  const data = await readJsonSafe(res);

  if (!res.ok) {
    const msg =
      (data as any)?.error ||
      (data as any)?.message ||
      (typeof data === "string" ? data : null) ||
      (res.status === 0 ? "network_error" : null) ||
      `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }

  return data as T;
}