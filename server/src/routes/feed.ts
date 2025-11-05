
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

const r = Router();

const feedQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().trim().optional(),
});

r.get(
  "/",
  requireAuth,
  validateQuery(feedQuery),
  asyncHandler(async (req: AuthedRequest, res) => {
    type FeedQuery = z.infer<typeof feedQuery>;
    const { limit, cursor } = (req.query as unknown as FeedQuery);

    const parsed = parseCursor(cursor);

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
    pipeline.push({ $limit: limit + 1 });

    const rows = await Post.aggregate(pipeline).exec();

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

    let nextCursor: string | null = null;
    if (rows.length > limit) {
      const last = rows[limit - 1];
      nextCursor = makeCursor({ createdAt: last.createdAt, _id: last._id });
    }

    const items = await Promise.all(rows.slice(0, limit).map(annotate));
    res.json({ items, nextCursor });
  })
);

export default r;