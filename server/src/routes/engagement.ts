
import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import Post from "../models/Post";
import Like from "../models/Like";
import Comment from "../models/Comment";

const r = Router();
const objectId = z.string().refine(Types.ObjectId.isValid, "invalid_object_id");

// Like a post (idempotent)
r.post("/posts/:id/like", requireAuth, async (req: AuthedRequest, res) => {
  const id = objectId.parse(req.params.id);
  const post = await Post.exists({ _id: id });
  if (!post) return res.status(404).json({ error: "not_found" });

  await Like.updateOne(
    { postId: id, userId: req.user!.id },
    { $setOnInsert: { postId: id, userId: req.user!.id } },
    { upsert: true }
  );
  res.json({ liked: true });
});

// Unlike a post
r.delete("/posts/:id/like", requireAuth, async (req: AuthedRequest, res) => {
  const id = objectId.parse(req.params.id);
  await Like.deleteOne({ postId: id, userId: req.user!.id });
  res.json({ liked: false });
});

// Create a comment
const commentBody = z.object({ text: z.string().trim().min(1).max(1000) });
r.post("/posts/:id/comments", requireAuth, async (req: AuthedRequest, res) => {
  const id = objectId.parse(req.params.id);
  const parsed = commentBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());

  const post = await Post.exists({ _id: id });
  if (!post) return res.status(404).json({ error: "not_found" });

  const c = await Comment.create({
    postId: id,
    userId: req.user!.id,
    text: parsed.data.text,
  });
  res.status(201).json({ id: String(c._id) });
});

// List comments (simple cursor by createdAt/_id)
const listQuery = z.object({ limit: z.coerce.number().int().min(1).max(50).default(20), cursor: z.string().optional() });
r.get("/posts/:id/comments", requireAuth, async (req: AuthedRequest, res) => {
  const id = objectId.parse(req.params.id);
  const { limit, cursor } = listQuery.parse(req.query);

  const match: any = { postId: new Types.ObjectId(id) };
  if (cursor) {
    const [tsMs, oid] = cursor.split("_");
    match.$or = [
      { createdAt: { $lt: new Date(Number(tsMs)) } },
      { createdAt: new Date(Number(tsMs)), _id: { $lt: new Types.ObjectId(oid) } },
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
r.delete("/posts/:id/comments/:commentId", requireAuth, async (req: AuthedRequest, res) => {
  const id = objectId.parse(req.params.id);
  const commentId = objectId.parse(req.params.commentId);

  const c = await Comment.findById(commentId).select("_id userId postId");
  if (!c || String(c.postId) !== id) return res.status(404).json({ error: "not_found" });
  if (String(c.userId) !== req.user!.id) return res.status(403).json({ error: "forbidden" });

  await Comment.deleteOne({ _id: c._id });
  res.json({ ok: true });
});

export default r;