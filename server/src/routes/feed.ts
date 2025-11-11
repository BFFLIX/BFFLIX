
// server/src/routes/feed.ts
import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import Post from "../models/Post";
import Circle from "../models/Circles/Circle";
import User from "../models/user";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { validateQuery } from "../middleware/validate";
import { asyncHandler } from "../middleware/asyncHandler";
import { makeCursor, parseCursor } from "../lib/cursor";
import { getPlayableServicesForTitle } from "../Services/providers";
import Like from "../models/Like";
import Comment from "../models/Comment";

const r = Router();

const feedQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().trim().optional(),
  sort: z.enum(["latest", "smart"]).optional().default("smart"),
});

r.get(
  "/",
  requireAuth,
  validateQuery(feedQuery),
  asyncHandler(async (req: AuthedRequest, res) => {
    type FeedQuery = z.infer<typeof feedQuery>;
    const { limit, cursor, sort } = (req.query as unknown as FeedQuery);

    const parsed = parseCursor(cursor);

    // Pull a slightly larger window when using smart sort so we can rank better,
    // then trim to the requested `limit`.
    const softCap = sort === "smart" ? Math.min(limit * 3, 150) : (limit + 1);

    // 1) user services once
    const me = await User.findById(req.user!.id).select("services").lean();
    const myServices = new Set<string>(Array.isArray(me?.services) ? me!.services : []);

    // 2) my circles
    const myCircleIds = await Circle.find({ members: req.user!.id })
      .select("_id")
      .lean()
      .then((docs) => docs.map((d) => d._id as Types.ObjectId));

    if (myCircleIds.length === 0) {
      return res.json({ items: [], nextCursor: null });
    }

    // 3) aggregate with cross-post dedupe
    const pipeline: any[] = [
      { $match: { circles: { $in: myCircleIds } } },
      { $sort: { createdAt: -1, _id: -1 } },
      {
        $group: {
          _id: "$canonicalId",
          first: { $first: "$$ROOT" },
          circlesSets: { $addToSet: "$circles" },
        },
      },
      {
        $project: {
          mergedCircles: {
            $reduce: {
              input: "$circlesSets",
              initialValue: [],
              in: { $setUnion: ["$$value", "$$this"] },
            },
          },
          item: "$first",
        },
      },
      { $replaceRoot: { newRoot: { $mergeObjects: ["$item", { circles: "$mergedCircles" }] } } },
    ];

    if (parsed) {
      pipeline.push({
        $match: {
          $or: [
            { createdAt: { $lt: parsed.ts } },
            { createdAt: parsed.ts, _id: { $lt: parsed.oid } },
          ],
        },
      });
    }

    pipeline.push({ $sort: { createdAt: -1, _id: -1 } });
    pipeline.push({ $limit: softCap });

    const rows = await Post.aggregate(pipeline).exec();

    // Build author → mutual circle count (how many circles you and the author share)
    const authorIds: string[] = Array.from(
      new Set(rows.map((r: any) => String(r.authorId)).filter(Boolean))
    );
    const mutualMap = new Map<string, number>();
    if (authorIds.length) {
      await Promise.all(
        authorIds.map(async (aid) => {
          const cnt = await Circle.countDocuments({
            _id: { $in: myCircleIds },
            members: new Types.ObjectId(aid),
          });
          mutualMap.set(aid, cnt);
        })
      );
    }

    // Compute recent circle activity for smart ranking (last 14 days)
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const activityDocs = await Post.aggregate([
      { $match: { circles: { $in: myCircleIds }, createdAt: { $gte: since } } },
      { $unwind: "$circles" },
      { $match: { circles: { $in: myCircleIds } } },
      { $group: { _id: "$circles", count: { $sum: 1 } } }
    ]);
    const circleActivity = new Map<string, number>(
      activityDocs.map((d: any) => [String(d._id), d.count as number])
    );
    const maxActivity = Math.max(1, ...activityDocs.map((d: any) => d.count as number));

    // --- Engagement signals (likes & comments) over the last 14 days ---
    const postIds: Types.ObjectId[] = rows.map((r: any) => r._id);

    // Build friend set = users that share any circle with me
    const friendIds = await Circle.aggregate([
      { $match: { _id: { $in: myCircleIds } } },
      { $project: { members: 1 } },
      { $unwind: "$members" },
      { $group: { _id: "$members" } },
    ]).then((d) => new Set(d.map((x: any) => String(x._id))));

    // Like counts
    const likeCounts = new Map<string, number>();
    const friendLikeCounts = new Map<string, number>();
    if (postIds.length) {
      const likesAgg = await Like.aggregate([
        { $match: { postId: { $in: postIds }, createdAt: { $gte: since } } },
        { $group: { _id: "$postId", count: { $sum: 1 } } },
      ]);
      likesAgg.forEach((x: any) => likeCounts.set(String(x._id), x.count));

      const friendLikesAgg = await Like.aggregate([
        { $match: { postId: { $in: postIds }, createdAt: { $gte: since } } },
        { $group: { _id: { postId: "$postId", userId: "$userId" }, one: { $sum: 1 } } },
      ]);
      friendLikesAgg.forEach((x: any) => {
        const pid = String(x._id.postId);
        const uid = String(x._id.userId);
        if (friendIds.has(uid)) {
          friendLikeCounts.set(pid, (friendLikeCounts.get(pid) || 0) + 1);
        }
      });
    }

    // Comment counts
    const commentCounts = new Map<string, number>();
    const friendCommentCounts = new Map<string, number>();
    if (postIds.length) {
      const comAgg = await Comment.aggregate([
        { $match: { postId: { $in: postIds }, createdAt: { $gte: since } } },
        { $group: { _id: "$postId", count: { $sum: 1 } } },
      ]);
      comAgg.forEach((x: any) => commentCounts.set(String(x._id), x.count));

      const friendComAgg = await Comment.aggregate([
        { $match: { postId: { $in: postIds }, createdAt: { $gte: since } } },
        { $group: { _id: { postId: "$postId", userId: "$userId" }, one: { $sum: 1 } } },
      ]);
      friendComAgg.forEach((x: any) => {
        const pid = String(x._id.postId);
        const uid = String(x._id.userId);
        if (friendIds.has(uid)) {
          friendCommentCounts.set(pid, (friendCommentCounts.get(pid) || 0) + 1);
        }
      });
    }

    // 4) annotate with playableOnMyServices (memoized per request)
    const memo = new Map<string, string[]>();
    async function annotate(row: any) {
      const key = `${row.type}:${row.tmdbId}`;
      let providers = memo.get(key);
      if (!providers) {
        providers = await getPlayableServicesForTitle(row.type, row.tmdbId, "US");
        memo.set(key, providers);
      }
      const playable = providers.filter((p) => myServices.has(p));

      return {
        ...row,
        id: String(row._id),
        _id: undefined,
        playableOnMyServices: playable,   // <= the new field you wanted
        availableOn: providers,           // optional: all US providers, if you want to show gray badges
      };
    }

    // Recency decay: τ ≈ 72 hours (about a 3‑day half‑life feel)
    const tauHours = 72;

    // Score helper for smart ranking
    const now = Date.now();
    function scoreRow(row: any, playableCount: number, mutualCircles: number): number {
      // 1) Recency decay
      const ageH = Math.max(0, (now - new Date(row.createdAt).getTime()) / (1000 * 60 * 60));
      const recency = Math.exp(-ageH / tauHours);

      // 2) Circle activity weight (sum of recent posts across all circles for this item)
      const act = Array.isArray(row.circles)
        ? row.circles.reduce((sum: number, c: any) => sum + (circleActivity.get(String(c)) || 0), 0)
        : 0;
      const activityWeight = act / maxActivity;

      // 3) Engagement hints from the post itself
      const engagement =
        (row.rating ? 0.3 : 0) +
        (row.comment ? (Math.min(String(row.comment).length, 300) / 300) * 0.2 : 0);

      // 4) Playable boost (if it matches user's services)
      const playableBoost = Math.min(playableCount, 3) * 0.15; // up to +0.45

      // 5) Personal engagement: boost authors who share more circles with the viewer
      const mutualClamped = Math.min(Math.max(mutualCircles || 0, 0), 3);
      const personalBoost = (mutualClamped / 3) * 0.35; // up to +0.35

      // 6) Social engagement: likes/comments overall and by friends (last 14 days)
      const pid = String((row as any).id || (row as any)._id);
      const likes = likeCounts.get(pid) || 0;
      const comments = commentCounts.get(pid) || 0;
      const friendLikes = friendLikeCounts.get(pid) || 0;
      const friendComments = friendCommentCounts.get(pid) || 0;

      const engagementGlobal = Math.log1p(likes + comments) * 0.15;
      const engagementFriends = Math.log1p(friendLikes + friendComments) * 0.35;

      // Final score
      return recency * (1.0 + activityWeight * 0.9 + engagement + playableBoost + personalBoost + engagementGlobal + engagementFriends);
    }

    // Annotate first (providers), then rank if needed
    const annotated = await Promise.all(rows.map(annotate));

    let ranked = annotated;
    if (sort === "smart") {
      ranked = annotated
        .map((row) => {
          const playableCount = Array.isArray(row.playableOnMyServices) ? row.playableOnMyServices.length : 0;
          const mutual = mutualMap.get(String(row.authorId)) || 0;
          const s = scoreRow(row, playableCount, mutual);
          return { row, _score: s };
        })
        .sort((a, b) => b._score - a._score)
        .map((x) => ({ ...x.row, _score: Number(x._score.toFixed(4)) }));
    }

    // Trim to limit and derive nextCursor using the *chronological* position of the last returned item.
    // We keep cursor chronological so clients can mix smart ranking with stable pagination.
    const slice = ranked.slice(0, limit);
    let nextCursor: string | null = null;
    if (ranked.length > limit) {
      const tail = slice[slice.length - 1];
      nextCursor = makeCursor({ createdAt: tail.createdAt, _id: tail.id || tail._id });
    }

    res.json({ items: slice, nextCursor });
  })
);

export default r;
