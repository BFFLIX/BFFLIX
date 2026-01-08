
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
import Like from "../models/Like";
import Comment from "../models/Comment";
import tmdb from "../Services/tmdb.service";
import { getPlayableServicesForTitle } from "../Services/providers";

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

    // Check if circle exists and get visibility
    const circle = await Circle.findById(circleId).select("visibility members").lean();
    if (!circle) return res.status(404).json({ error: "not_found", message: "circle not found" });

    // For private circles, require membership
    const isMember = Array.isArray(circle.members) &&
                     circle.members.some((m: any) => String(m) === req.user!.id);

    if (circle.visibility === "private" && !isMember) {
      return res.status(403).json({ error: "forbidden", message: "access denied" });
    }

    // Public circles allow preview for non-members

    const items = await Post.find({ circles: circleId })
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const postsWithProfiles = await attachAuthorProfiles(items);

    const postIds = postsWithProfiles.map((p) => p._id as Types.ObjectId);

    const circleIdSet = new Set<string>();
    postsWithProfiles.forEach((p) => {
      if (Array.isArray(p.circles)) {
        p.circles.forEach((cid: any) => circleIdSet.add(String(cid)));
      }
    });

    const [likesAgg, myLikes, commentsAgg, circleDocs] = await Promise.all([
      postIds.length
        ? Like.aggregate([
            { $match: { postId: { $in: postIds } } },
            { $group: { _id: "$postId", count: { $sum: 1 } } },
          ])
        : [],
      postIds.length
        ? Like.find({ postId: { $in: postIds }, userId: req.user!.id })
            .select("postId")
            .lean()
        : [],
      postIds.length
        ? Comment.aggregate([
            { $match: { postId: { $in: postIds } } },
            { $group: { _id: "$postId", count: { $sum: 1 } } },
          ])
        : [],
      circleIdSet.size
        ? Circle.find({ _id: { $in: Array.from(circleIdSet) } })
            .select("_id name")
            .lean()
        : [],
    ]);

    const likeCounts = new Map<string, number>();
    likesAgg.forEach((row: any) => likeCounts.set(String(row._id), row.count));

    const likedByMe = new Set<string>();
    myLikes.forEach((row: any) => likedByMe.add(String(row.postId)));

    const commentCounts = new Map<string, number>();
    commentsAgg.forEach((row: any) => commentCounts.set(String(row._id), row.count));

    const circleNameMap = new Map<string, string>();
    circleDocs.forEach((doc: any) => {
      circleNameMap.set(String(doc._id), doc.name || "Circle");
    });

    type MediaMeta = { title: string; year?: number; poster?: string };

    const memoMeta = new Map<string, MediaMeta>();
    const memoProviders = new Map<string, string[]>();

    const fetchMeta = async (type: "movie" | "tv", tmdbId: string) => {
      const key = `${type}:${tmdbId}`;
      if (memoMeta.has(key)) return memoMeta.get(key)!;

      try {
        if (type === "movie") {
          const d = await tmdb.getMovieDetails(tmdbId);
          const meta: MediaMeta = {
            title: d?.title || d?.original_title || "Untitled",
          };

          const yearStr = d?.release_date ? String(d.release_date).slice(0, 4) : "";
          const yearNum = yearStr ? Number(yearStr) : undefined;
          if (typeof yearNum === "number" && !Number.isNaN(yearNum)) {
            meta.year = yearNum;
          }

          const posterUrl = tmdb.getPosterURL(d?.poster_path || null) || undefined;
          if (posterUrl) {
            meta.poster = posterUrl;
          }

          memoMeta.set(key, meta);
          return meta;
        }

        const d = await tmdb.getTVDetails(tmdbId);
        const meta: MediaMeta = {
          title: d?.name || d?.original_name || "Untitled",
        };

        const yearStr = d?.first_air_date ? String(d.first_air_date).slice(0, 4) : "";
        const yearNum = yearStr ? Number(yearStr) : undefined;
        if (typeof yearNum === "number" && !Number.isNaN(yearNum)) {
          meta.year = yearNum;
        }

        const posterUrl = tmdb.getPosterURL(d?.poster_path || null) || undefined;
        if (posterUrl) {
          meta.poster = posterUrl;
        }

        memoMeta.set(key, meta);
        return meta;
      } catch (err) {
        console.warn("tmdb lookup failed for", key, err);
        const fallback: MediaMeta = { title: "Untitled" };
        memoMeta.set(key, fallback);
        return fallback;
      }
    };

    const fetchProviders = async (type: "movie" | "tv", tmdbId: string) => {
      const key = `${type}:${tmdbId}`;
      if (memoProviders.has(key)) return memoProviders.get(key)!;
      try {
        const providers = await getPlayableServicesForTitle(type, tmdbId, "US");
        memoProviders.set(key, providers);
        return providers;
      } catch (err) {
        console.warn("provider lookup failed for", key, err);
        memoProviders.set(key, []);
        return [];
      }
    };

    const enrichedItems = await Promise.all(
      postsWithProfiles.map(async (post) => {
        const id = String(post._id);
        const mediaType: "movie" | "tv" = post.type === "tv" ? "tv" : "movie";
        const meta = await fetchMeta(mediaType, String(post.tmdbId));
        const providers = await fetchProviders(mediaType, String(post.tmdbId));

        const circleNames = Array.isArray(post.circles)
          ? post.circles
              .map((cid: any) => circleNameMap.get(String(cid)))
              .filter((n): n is string => Boolean(n))
          : [];

        return {
          ...post,
          _id: id,
          id,
          type: mediaType,
          title: meta?.title || "Untitled",
          year: meta?.year,
          imageUrl: meta?.poster,
          services: providers,
          circleNames,
          body:
            typeof post.comment === "string" && post.comment.trim().length
              ? post.comment
              : post.body || post.text || "",
          likeCount: likeCounts.get(id) || 0,
          commentCount: commentCounts.get(id) || 0,
          likedByMe: likedByMe.has(id),
        };
      })
    );

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

// -------------------- Remove post from circle (moderator action) --------------------
const removeFromCircleParams = z.object({
  postId: objectId,
  circleId: objectId,
});

r.delete(
  "/:postId/circles/:circleId",
  requireAuth,
  validateParams(removeFromCircleParams),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { postId, circleId } = res.locals.params as z.infer<typeof removeFromCircleParams>;

    // Check if circle exists and user is moderator/owner
    const circle = await Circle.findById(circleId).select("createdBy moderators").lean();
    if (!circle) {
      return res.status(404).json({ error: "not_found", message: "circle not found" });
    }

    const isOwner = String(circle.createdBy) === req.user!.id;
    const isModerator = Array.isArray(circle.moderators) &&
      circle.moderators.some((modId: any) => String(modId) === req.user!.id);

    if (!isOwner && !isModerator) {
      return res.status(403).json({
        error: "forbidden",
        message: "only circle owner or moderators can remove posts"
      });
    }

    // Check if post exists
    const post = await Post.findById(postId).select("circles").lean();
    if (!post) {
      return res.status(404).json({ error: "not_found", message: "post not found" });
    }

    // Remove circle from post.circles array
    await Post.findByIdAndUpdate(postId, {
      $pull: { circles: circleId }
    });

    res.json({ ok: true, message: "Post removed from circle" });
  })
);

export default r;
