
// server/src/routes/posts.ts
import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import Post from "../models/Post";
import Circle from "../models/Circles/Circle";
import User from "../models/user";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { validateBody, validateQuery, validateParams } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import Viewing from "../models/Viewing";

const r = Router();

// -------------------- Helpers --------------------
const objectId = z.string().refine(Types.ObjectId.isValid, "invalid_object_id");

const pagedQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

type LeanPost = Record<string, any>;

async function attachAuthorProfiles(posts: LeanPost[]): Promise<LeanPost[]> {
  if (!posts.length) return posts;

  const authorIds = Array.from(
    new Set(
      posts
        .map((p) => (p.authorId ? String(p.authorId) : ""))
        .filter((id): id is string => Boolean(id))
    )
  );

  if (!authorIds.length) {
    return posts.map((post) => ({
      ...post,
      authorId: post.authorId ? String(post.authorId) : undefined,
    }));
  }

  const authors = await User.find({ _id: { $in: authorIds } })
    .select("_id name avatarUrl")
    .lean();

  const profileMap = new Map<string, { name: string; avatarUrl?: string }>();
  authors.forEach((user: any) => {
    const safeName =
      typeof user.name === "string" && user.name.trim().length
        ? user.name.trim()
        : "Someone";
    const avatar =
      typeof user.avatarUrl === "string" ? user.avatarUrl.trim() : "";
    profileMap.set(String(user._id), {
      name: safeName,
      avatarUrl: avatar || undefined,
    });
  });

  return posts.map((post) => {
    const key = post.authorId ? String(post.authorId) : "";
    const profile = key ? profileMap.get(key) : undefined;
    const fallbackName =
      (typeof post.authorName === "string" && post.authorName.trim()) ||
      "Someone";

    return {
      ...post,
      authorId: key || undefined,
      authorName: profile?.name || fallbackName,
      authorAvatarUrl: profile?.avatarUrl,
    };
  });
}

// -------------------- Create --------------------
const createSchema = z
  .object({
    type: z.enum(["movie", "tv"]),
    tmdbId: z.string().trim().min(1).max(40),
    circles: z.array(objectId).min(1, "at least one circle"),
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().trim().max(1000).optional(),
    watchedAt: z.coerce.date().optional(),
    seasonNumber: z.coerce.number().int().min(0).optional(),
    episodeNumber: z.coerce.number().int().min(0).optional(),
  })
  .refine((d) => !(d.episodeNumber != null && d.seasonNumber == null), {
    message: "seasonNumber is required when episodeNumber is provided",
    path: ["seasonNumber"],
  })
  .refine((d) => !!d.rating || (d.comment != null && d.comment.length > 0), {
    message: "Provide a rating or a comment",
    path: ["rating"],
  });

r.post(
  "/",
  requireAuth,
  validateBody(createSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const {
      type,
      tmdbId,
      circles,
      rating,
      comment,
      watchedAt,
      seasonNumber,
      episodeNumber,
    } = res.locals.body as z.infer<typeof createSchema>;

    // Must be member of ALL circles
    const count = await Circle.countDocuments({ _id: { $in: circles }, members: req.user!.id });
    if (count !== circles.length) {
      return res.status(403).json({ error: "forbidden", message: "not a member of one or more circles" });
    }

    const post = await Post.create({
      authorId: req.user!.id,
      type,
      tmdbId,
      circles,
      rating,
      comment,
      watchedAt,
      seasonNumber,
      episodeNumber,
    });

    // Also create a viewing for the author so it appears in past viewings
    try {
      await Viewing.create({
        userId: req.user!.id,
        type,
        tmdbId,
        rating,
        comment,
        watchedAt,
        seasonNumber,
        episodeNumber,
      });
    } catch (err) {
      console.warn("Failed to record viewing for post", err);
      // Do not fail the post creation if viewing creation fails
    }

    res.status(201).json({ id: post.id });
  })
);

// -------------------- List posts in a circle --------------------
const circleParams = z.object({ circleId: objectId });

r.get(
  "/circle/:circleId",
  requireAuth,
  validateParams(circleParams),
  validateQuery(pagedQuery),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { circleId } = res.locals.params as z.infer<typeof circleParams>;
    const { page, limit } = res.locals.query as z.infer<typeof pagedQuery>;

    // Ensure requester is a member
    const circle = await Circle.exists({ _id: circleId, members: req.user!.id });
    if (!circle) return res.status(403).json({ error: "forbidden", message: "access denied" });

    const items = await Post.find({ circles: circleId })
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const enrichedItems = await attachAuthorProfiles(items);

    res.json({ page, limit, items: enrichedItems });
  })
);

// -------------------- List my posts --------------------
r.get(
  "/me",
  requireAuth,
  validateQuery(pagedQuery),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { page, limit } = res.locals.query as z.infer<typeof pagedQuery>;

    const items = await Post.find({ authorId: req.user!.id })
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const enrichedItems = await attachAuthorProfiles(items);

    res.json({ page, limit, items: enrichedItems });
  })
);

// -------------------- Edit (author only) --------------------
const idParams = z.object({ id: objectId });

const patchSchema = z
  .object({
    type: z.enum(["movie", "tv"]).optional(),
    tmdbId: z.string().trim().min(1).max(40).optional(),
    rating: z.number().int().min(1).max(5).nullable().optional(),
    comment: z.string().trim().max(1000).nullable().optional(),
    watchedAt: z.coerce.date().nullable().optional(),
    circles: z.array(objectId).min(1).optional(),
    seasonNumber: z.coerce.number().int().min(0).nullable().optional(),
    episodeNumber: z.coerce.number().int().min(0).nullable().optional(),
  })
  .refine((d) => !(d.episodeNumber != null && d.seasonNumber == null), {
    message: "seasonNumber is required when episodeNumber is provided",
    path: ["seasonNumber"],
  });

r.patch(
  "/:id",
  requireAuth,
  validateParams(idParams),
  validateBody(patchSchema),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { id } = res.locals.params as z.infer<typeof idParams>;
    const changes = res.locals.body as z.infer<typeof patchSchema>;

    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ error: "not_found", message: "post not found" });
    if (String(post.authorId) !== req.user!.id)
      return res.status(403).json({ error: "forbidden", message: "only author can edit" });

    // circles reassignment (validate membership)
    if (changes.circles) {
      const count = await Circle.countDocuments({ _id: { $in: changes.circles }, members: req.user!.id });
      if (count !== changes.circles.length) {
        return res.status(403).json({ error: "forbidden", message: "not a member of one or more circles" });
      }
      post.set("circles", changes.circles);
    }

    if (changes.type) post.set("type", changes.type);
    if (changes.tmdbId) post.set("tmdbId", changes.tmdbId);

    // rating/comment/watchedAt — unset with undefined
    if ("rating" in changes) post.set("rating", changes.rating == null ? undefined : changes.rating);
    if ("comment" in changes) post.set("comment", changes.comment == null ? undefined : changes.comment);
    if ("watchedAt" in changes) post.set("watchedAt", changes.watchedAt == null ? undefined : changes.watchedAt);

    if ("seasonNumber" in changes)
      post.set("seasonNumber", changes.seasonNumber == null ? undefined : changes.seasonNumber);
    if ("episodeNumber" in changes)
      post.set("episodeNumber", changes.episodeNumber == null ? undefined : changes.episodeNumber);

    // Must have some content after edits
    const hasRating = !!post.get("rating");
    const hasComment = !!post.get("comment");
    if (!hasRating && !hasComment) {
      return res.status(400).json({ error: "validation_error", message: "rating or comment required" });
    }
    // If episode present, season must be present
    if (post.get("episodeNumber") != null && post.get("seasonNumber") == null) {
      return res.status(400).json({ error: "validation_error", message: "seasonNumber required with episodeNumber" });
    }

    await post.save();
    res.json({ ok: true });
  })
);

// -------------------- Delete (author only) --------------------
r.delete(
  "/:id",
  requireAuth,
  validateParams(idParams),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { id } = res.locals.params as z.infer<typeof idParams>;

    const post = await Post.findById(id).select("_id authorId").lean();
    if (!post) return res.status(404).json({ error: "not_found", message: "post not found" });
    if (String(post.authorId) !== req.user!.id)
      return res.status(403).json({ error: "forbidden", message: "only author can delete" });

    await Post.findByIdAndDelete(id);
    res.json({ ok: true });
  })
);

export default r;
