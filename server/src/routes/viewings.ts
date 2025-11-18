
import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import Viewing from "../models/Viewing";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { paginationQuery } from "../utils/pagination";

// -----------------------------------------------------------------------------
// Validators & helpers
// -----------------------------------------------------------------------------
const r = Router();

const objectId = z.string().refine(Types.ObjectId.isValid, "Invalid ObjectId");

// Simple page/limit schema (used by the older /me endpoint)
const paged = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

// Allow optional idempotency key to prevent accidental duplicates
const createSchema = z
  .object({
    type: z.enum(["movie", "tv"]),
    tmdbId: z.string().min(1).max(40).trim(),
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().trim().max(1000).optional(),
    watchedAt: z.coerce.date().optional(),
    seasonNumber: z.coerce.number().int().min(0).optional(),
    episodeNumber: z.coerce.number().int().min(0).optional(),
    idemKey: z.string().min(8).max(64).optional(), // optional idempotency key
  })
  .refine((d) => !(d.episodeNumber != null && d.seasonNumber == null), {
    message: "seasonNumber is required when episodeNumber is provided",
  });

// Optional filters for listing your own viewings (old /me endpoint)
const meQuery = paged.extend({
  type: z.enum(["movie", "tv"]).optional(),
  start: z.coerce.date().optional(), // inclusive
  end: z.coerce.date().optional(), // exclusive
});

// New query schema that reuses your shared cursor-based pagination
const listAllQuery = paginationQuery.extend({
  type: z.enum(["movie", "tv"]).optional(),
  start: z.coerce.date().optional(), // watchedAt from (inclusive)
  end: z.coerce.date().optional(), // watchedAt to (exclusive)
});

// -----------------------------------------------------------------------------
// Create a viewing
// -----------------------------------------------------------------------------
r.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());

  try {
    const doc = await Viewing.create({ userId: req.user!.id, ...parsed.data });
    return res.status(201).json({ id: doc.id });
  } catch (err: any) {
    // If client supplied an idemKey, treat duplicate key as idempotent success
    if (parsed.data.idemKey && err?.code === 11000) {
      const existing = await Viewing.findOne({
        idemKey: parsed.data.idemKey,
      }).lean({ virtuals: true });
      if (existing) return res.status(200).json({ id: (existing as any).id });
    }
    // Unknown error
    console.error("[viewings POST] error:", err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// -----------------------------------------------------------------------------
// NEW: List all my viewings (cursor-based pagination)
// GET /viewings?limit=20&cursor=...&sort=desc&type=movie&start=...&end=...
// -----------------------------------------------------------------------------
r.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = listAllQuery.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json(parsed.error.format());
  }

  const {
    limit,
    cursor,
    sort,
    createdBefore,
    createdAfter,
    type,
    start,
    end,
  } = parsed.data;

  // Base filter – only this user's viewings
  const filter: Record<string, any> = { userId: req.user!.id };

  // Optional type filter
  if (type) {
    filter.type = type;
  }

  // Optional watchedAt range filter
  if (start || end) {
    filter.watchedAt = {};
    if (start) filter.watchedAt.$gte = start;
    if (end) filter.watchedAt.$lt = end;
  }

  // Optional createdAt range filter
  if (createdBefore || createdAfter) {
    filter.createdAt = filter.createdAt || {};
    if (createdAfter) filter.createdAt.$gte = createdAfter;
    if (createdBefore) filter.createdAt.$lt = createdBefore;
  }

  // Cursor logic – stable ordering on createdAt + _id
  let cursorFilter: Record<string, any> = {};
  if (cursor) {
    const cursorDoc = await Viewing.findById(cursor)
      .select("_id createdAt")
      .lean();

    if (!cursorDoc) {
      return res.status(400).json({ error: "invalid_cursor" });
    }

    const op = sort === "asc" ? "$gt" : "$lt";

    cursorFilter = {
      $or: [
        { createdAt: { [op]: cursorDoc.createdAt } },
        {
          createdAt: cursorDoc.createdAt,
          _id: { [op]: cursorDoc._id },
        },
      ],
    };
  }

  const mongoFilter =
    cursor && Object.keys(cursorFilter).length > 0
      ? { $and: [filter, cursorFilter] }
      : filter;

  const sortDir = sort === "asc" ? 1 : -1;

  // Fetch one extra doc to know if there is a next page
  const docs = await Viewing.find(mongoFilter)
    .sort({ createdAt: sortDir, _id: sortDir })
    .limit(limit + 1)
    .lean({ virtuals: true });

  const hasMore = docs.length > limit;
  const items = hasMore ? docs.slice(0, limit) : docs;

  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const lastDoc = items[items.length - 1];
    if (lastDoc && (lastDoc as any)._id) {
      nextCursor = String((lastDoc as any)._id);
    }
  }

  res.json({
    items,
    nextCursor,
    hasMore,
    limit,
    sort,
  });
});

// -----------------------------------------------------------------------------
// List my viewings with simple page/limit (/viewings/me)
// -----------------------------------------------------------------------------
r.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const qp = meQuery.safeParse(req.query);
  if (!qp.success) return res.status(400).json(qp.error.format());
  const { page, limit, type, start, end } = qp.data;

  const filter: Record<string, any> = { userId: req.user!.id };
  if (type) filter.type = type;
  if (start || end) {
    filter.watchedAt = {};
    if (start) filter.watchedAt.$gte = start;
    if (end) filter.watchedAt.$lt = end;
  }

  const items = await Viewing.find(filter)
    .sort({ watchedAt: -1, _id: -1 }) // stable sort for pagination
    .skip((page - 1) * limit)
    .limit(limit)
    .lean({ virtuals: true }); // include virtual id in results

  res.json({ page, limit, items });
});

// -----------------------------------------------------------------------------
// Delete a viewing (owner only)
// -----------------------------------------------------------------------------
r.delete("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const idCheck = objectId.safeParse(req.params.id);
  if (!idCheck.success)
    return res.status(400).json({ error: "Invalid viewing id" });

  const v = await Viewing.findById(idCheck.data).select("_id userId").lean();
  if (!v) return res.status(404).json({ error: "Viewing not found" });
  if (String(v.userId) !== req.user!.id) {
    return res
      .status(403)
      .json({ error: "You can only delete your own viewing" });
  }

  await Viewing.findByIdAndDelete(idCheck.data);
  res.json({ ok: true });
});

export default r;
