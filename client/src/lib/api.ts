
// client/src/lib/api.ts
const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://bfflix.onrender.com";

type JsonBody = Record<string, unknown>;

async function handleResponse(res: Response) {
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON error from backend
  }

  if (!res.ok) {
    const message =
      json?.error ||
      json?.message ||
      res.statusText ||
      "Request failed, please try again.";
    throw new Error(message);
  }
  return json;
}

export async function apiPost<T = any>(path: string, body: JsonBody): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // so cookies/session work if you use them
    body: JSON.stringify(body),
  });

  return handleResponse(res);
}