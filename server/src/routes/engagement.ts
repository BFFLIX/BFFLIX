
// src/routes/engagement.ts
import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import Post from "../models/Post";
import Like from "../models/Like";
import Comment from "../models/Comment";
import Circle from "../models/Circles/Circle";

const r = Router();
const objectId = z.string().refine(Types.ObjectId.isValid, "invalid_object_id");

async function ensureMemberForPost(postId: string, userId: string) {
  const post = await Post.findById(postId).select("_id circles").lean();
  if (!post) return { ok: false, status: 404, body: { error: "not_found", message: "post not found" } };

  const count = await Circle.countDocuments({ _id: { $in: post.circles as any }, members: userId });
  if (count <= 0) return { ok: false, status: 403, body: { error: "forbidden", message: "not a member of post circles" } };

  return { ok: true, post };
}

// Like a post (idempotent)
r.post("/:id/like", requireAuth, async (req: AuthedRequest, res) => {
  const idCheck = objectId.safeParse(req.params.id);
  if (!idCheck.success) return res.status(400).json({ error: "invalid_object_id" });
  const id = idCheck.data;

  const can = await ensureMemberForPost(id, req.user!.id);
  if (!can.ok) return res.status(can.status ?? 403).json(can.body);

  await Like.updateOne(
    { postId: id, userId: req.user!.id },
    { $setOnInsert: { postId: id, userId: req.user!.id } },
    { upsert: true }
  );
  res.json({ liked: true });
});

// Unlike a post
r.delete("/:id/like", requireAuth, async (req: AuthedRequest, res) => {
  const idCheck = objectId.safeParse(req.params.id);
  if (!idCheck.success) return res.status(400).json({ error: "invalid_object_id" });
  const id = idCheck.data;

  const can = await ensureMemberForPost(id, req.user!.id);
  if (!can.ok) return res.status(can.status ?? 403).json(can.body);

  await Like.deleteOne({ postId: id, userId: req.user!.id });
  res.json({ liked: false });
});

// Create a comment
const commentBody = z.object({ text: z.string().trim().min(1).max(1000) });
r.post("/:id/comments", requireAuth, async (req: AuthedRequest, res) => {
  const idCheck = objectId.safeParse(req.params.id);
  if (!idCheck.success) return res.status(400).json({ error: "invalid_object_id" });
  const id = idCheck.data;

  const can = await ensureMemberForPost(id, req.user!.id);
  if (!can.ok) return res.status(can.status ?? 403).json(can.body);

  const parsed = commentBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());

  const c = await Comment.create({
    postId: id,
    userId: req.user!.id,
    text: parsed.data.text,
  });
  res.status(201).json({ id: String(c._id), createdAt: c.createdAt });
});

// List comments (simple cursor by createdAt/_id)
const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z
    .string()
    .regex(/^\d+_[0-9a-fA-F]{24}$/, "invalid_cursor")
    .optional(),
});
r.get("/:id/comments", requireAuth, async (req: AuthedRequest, res) => {
  const idCheck = objectId.safeParse(req.params.id);
  if (!idCheck.success) return res.status(400).json({ error: "invalid_object_id" });
  const id = idCheck.data;

  const can = await ensureMemberForPost(id, req.user!.id);
  if (!can.ok) return res.status(can.status ?? 403).json(can.body);

  const { limit, cursor } = listQuery.parse(req.query);

  const match: any = { postId: new Types.ObjectId(id) };
  if (cursor) {
    const [tsMs, oid] = cursor.split("_");
    const tsNum = Number(tsMs);
    if (!Number.isFinite(tsNum)) return res.status(400).json({ error: "invalid_cursor" });

    match.$or = [
      { createdAt: { $lt: new Date(tsNum) } },
      { createdAt: new Date(tsNum), _id: { $lt: new Types.ObjectId(oid) } },
    ];
  }

  const itemsPlusOne = await Comment.find(match)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = itemsPlusOne.length > limit;
  const items = itemsPlusOne.slice(0, limit);

  let nextCursor: string | null = null;
  if (hasMore) {
    const tail = items[items.length - 1];
    if (tail) {
      nextCursor = `${new Date(tail.createdAt).getTime()}_${String(tail._id)}`;
    }
  }

  res.json({ items, nextCursor });
});

// Delete a comment (author only for now)
r.delete("/:id/comments/:commentId", requireAuth, async (req: AuthedRequest, res) => {
  const idCheck = objectId.safeParse(req.params.id);
  if (!idCheck.success) return res.status(400).json({ error: "invalid_object_id" });
  const id = idCheck.data;

  const commentIdCheck = objectId.safeParse(req.params.commentId);
  if (!commentIdCheck.success) return res.status(400).json({ error: "invalid_object_id" });
  const commentId = commentIdCheck.data;

  const can = await ensureMemberForPost(id, req.user!.id);
  if (!can.ok) return res.status(can.status ?? 403).json(can.body);

  const c = await Comment.findById(commentId).select("_id userId postId");
  if (!c || String(c.postId) !== id) return res.status(404).json({ error: "not_found" });
  if (String(c.userId) !== req.user!.id) return res.status(403).json({ error: "forbidden" });

  await Comment.deleteOne({ _id: c._id });
  res.json({ ok: true });
});

export default r;