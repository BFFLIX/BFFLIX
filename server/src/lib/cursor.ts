
// server/src/lib/cursor.ts
import { Types } from "mongoose";

/** Make an opaque, URL-safe cursor from createdAt + _id (stable sort) */
export function makeCursor(d: { createdAt: Date; _id: Types.ObjectId }) {
  const payload = JSON.stringify({
    t: d.createdAt.toISOString(),
    id: d._id.toString(),
  });
  return Buffer.from(payload).toString("base64url");
}

/** Parse a cursor back into Date + ObjectId (returns null if invalid) */
export function parseCursor(s?: string | null) {
  if (!s) return null;
  try {
    const raw = Buffer.from(s, "base64url").toString();
    const { t, id } = JSON.parse(raw);
    const ts = new Date(t);
    if (Number.isNaN(ts.getTime())) return null;
    if (!Types.ObjectId.isValid(id)) return null;
    return { ts, oid: new Types.ObjectId(id) };
  } catch {
    return null;
  }
}
