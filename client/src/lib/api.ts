
// client/src/lib/api.ts
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? "http://localhost:8080"           // Dev: local backend
    : "https://bfflix.onrender.com");   // Prod: Render backend

type Json = Record<string, any> | null;

// Helper: read the JWT from the "token" cookie (if present)
function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("token="));

  if (!match) return null;
  // cookie is "token=VALUE"
  return decodeURIComponent(match.slice("token=".length));
}

async function request<T = Json>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getTokenFromCookie();

  // Build headers as a plain object so we can mutate them safely
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  // Add Authorization header if we have a token and caller didn't set one
  if (token && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    // IMPORTANT: send cookies to the backend (for other middleware, etc.)
    credentials: "include",
    ...options,
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // HTML error page or non-JSON response; ignore parse error
  }

  if (!res.ok) {
    const message =
      data?.error ||
      data?.message ||
      (res.status === 401 ? "missing_token" : `Request failed: ${res.status}`);
    throw new Error(message);
  }

  return data as T;
}

export function apiGet<T = Json>(path: string) {
  return request<T>(path, { method: "GET" });
}

export function apiPost<T = Json>(path: string, body?: any) {
  return request<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiPatch<T = Json>(path: string, body?: any) {
  return request<T>(path, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T = Json>(path: string) {
  return request<T>(path, { method: "DELETE" });
}