
import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import crypto from "crypto";
import Circle from "../models/Circles/Circle";

import User from "../models/user";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import CircleInvitation from "../models/Circles/CircleInvitation";
const r = Router();

// Reusable validators
const objectId = z.string().refine(Types.ObjectId.isValid, "Invalid ObjectId");

const paged = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value instanceof Types.ObjectId) return value.toHexString();
  if (typeof value === "object") {
    if (typeof value.toHexString === "function") return value.toHexString();
    if (value._id) return normalizeId(value._id);
    if (typeof value.toString === "function") {
      const str = value.toString();
      if (Types.ObjectId.isValid(str)) return new Types.ObjectId(str).toHexString();
      if (str && str !== "[object Object]") return str;
    }
  }
  if (Types.ObjectId.isValid(value)) {
    return new Types.ObjectId(value).toHexString();
  }
  return String(value);
};

//Moderator Validators (isOwner/isMod/isBoth)
async function isOwner(circleId: string, userId: string): Promise<boolean> {
  const circle = await Circle.findById(circleId).select("createdBy").lean();
  return circle ? normalizeId(circle.createdBy) === userId : false;
}

async function isModerator(circleId: string, userId: string): Promise<boolean> {
  const circle = await Circle.findById(circleId).select("moderators").lean();
  if (!circle) return false;
  return circle.moderators?.some(mod => normalizeId(mod) === userId) ?? false;
}

async function isOwnerOrMod(circleId: string, userId: string): Promise<boolean> {
  const circle = await Circle.findById(circleId).select("createdBy moderators").lean();
  if (!circle) return false;
  if (normalizeId(circle.createdBy) === userId) return true;
  return circle.moderators?.some(mod => normalizeId(mod) === userId) ?? false;
}

// ---------- Create a circle (private by default) ----------
const createSchema = z.object({
  name: z.string().min(1).max(80).trim(),
  description: z.string().max(240).trim().optional(),
  visibility: z.enum(["private", "public"]).optional().default("private"),
  members: z.array(objectId).optional(), // optional extra members besides creator
});

async function createUniqueInviteCode(retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    const code = crypto.randomBytes(8).toString("hex");
    // Optimistic: try an exists check to reduce duplicate key errors
    const exists = await Circle.exists({ inviteCode: code });
    if (!exists) return code;
  }
  // Fall through: let unique index enforce if all tries collide
  return crypto.randomBytes(8).toString("hex");
}

r.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());
  const { name, description, visibility, members = [] } = parsed.data;

  // Sanity-check provided members exist
  const uniq = Array.from(new Set([req.user!.id, ...members]));
  const count = await User.countDocuments({ _id: { $in: uniq } });
  if (count !== uniq.length) return res.status(400).json({ error: "One or more members do not exist" });

  const inviteCode = visibility === "private" ? await createUniqueInviteCode() : undefined;

  try {
    const circle = await Circle.create({
      name,
      description,
      visibility,
      createdBy: req.user!.id,
      members: uniq,
      inviteCode,
    });
    res.status(201).json({ id: circle.id });
  } catch (err: any) {
    if (err?.code === 11000 && err?.keyPattern?.inviteCode) {
      return res.status(409).json({ error: "invite_code_conflict" });
    }
    throw err;
  }
});

// ---------- Discover public circles ----------
// NOTE: must be BEFORE "/:id" so it's not swallowed by the :id route.
r.get("/discover/list", requireAuth, async (req: AuthedRequest, res) => {
  const qp = paged.safeParse(req.query);
  if (!qp.success) return res.status(400).json(qp.error.format());
  const { page, limit } = qp.data;

  const q = (req.query.q as string | undefined)?.trim() ?? "";
  const filter: any = { visibility: "public" };
  if (q) filter.name = { $regex: q, $options: "i" };

  const circles = await Circle.find(filter)
    .select("name description visibility members createdAt")
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean(); // use raw _id and map it ourselves

  const items = circles.map((c: any) => ({
    id: String(c._id), // explicit id so frontend can use it
    name: c.name,
    description: c.description,
    visibility: c.visibility,
    createdAt: c.createdAt,
    membersCount: Array.isArray(c.members) ? c.members.length : 0,
    isMember: Array.isArray(c.members)
      ? c.members.some((m: any) => String(m) === req.user!.id)
      : false,
  }));

  res.json({
    page,
    limit,
    items,
  });
});

// ---------- List my circles (paged) ----------
r.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const qp = paged.safeParse(req.query);
  if (!qp.success) return res.status(400).json(qp.error.format());
  const { page, limit } = qp.data;

  const circles = await Circle.find({ members: req.user!.id })
    .select("name description visibility createdBy members createdAt updatedAt")
    .sort({ updatedAt: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean(); // no virtuals, we map _id manually

  const items = circles.map((c: any) => ({
    id: String(c._id), // explicit id for frontend
    name: c.name,
    description: c.description,
    visibility: c.visibility,
    createdBy: c.createdBy,
    membersCount: Array.isArray(c.members) ? c.members.length : 0,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));

  res.json({ page, limit, items });
});
// ---------- Get one circle (public circles allow preview, private require membership) ----------
r.get("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const idCheck = objectId.safeParse(req.params.id);
  if (!idCheck.success) return res.status(400).json({ error: "Invalid id" });

  const circle = await Circle.findById(idCheck.data)
    .select("name description visibility createdBy members moderators inviteCode createdAt updatedAt")
    .populate("members", "name email username avatarUrl")
    .lean({ virtuals: true });

  if (!circle) return res.status(404).json({ error: "Circle not found" });

  // Check membership
  const isMember = Array.isArray(circle.members) && circle.members.some((m: any) => normalizeId(m?._id || m) === req.user!.id);

  // Private circles require membership
  if (circle.visibility === "private" && !isMember) {
    return res.status(403).json({ error: "Circle not found or access denied" });
  }

  const ownerId = normalizeId(circle.createdBy);
  const viewerIsOwner = ownerId === req.user!.id;
  const moderators = Array.isArray(circle.moderators)
    ? circle.moderators.map((m: any) => normalizeId(m))
    : [];
  const viewerIsModerator = viewerIsOwner || moderators.includes(req.user!.id);

  const members = Array.isArray(circle.members)
    ? circle.members.map((member: any) => {
        const memberId = normalizeId(member?.id || member?._id || member);
        const isOwner = memberId === ownerId;
        const isModerator = moderators.includes(memberId);
        const avatar =
          typeof member?.avatarUrl === "string" ? member.avatarUrl.trim() : "";
        return {
          id: memberId,
          name: member?.name || "Member",
          email: member?.email,
          username: member?.username,
          avatarUrl: avatar || undefined,
          isOwner,
          isModerator,
          role: isOwner ? "owner" : isModerator ? "moderator" : "member",
        };
      })
    : [];

  const payload: any = {
    id: String(circle._id),
    name: circle.name,
    description: circle.description,
    visibility: circle.visibility,
    createdBy: ownerId,
    createdAt: circle.createdAt,
    updatedAt: circle.updatedAt,
    members,
    membersCount: members.length,
    isMember,
    permissions: {
      isOwner: viewerIsOwner,
      isModerator: viewerIsModerator && !viewerIsOwner,
      canInvite: viewerIsOwner || viewerIsModerator,
      canPromote: viewerIsOwner,
    },
  };

  if (circle.visibility === "private" && (viewerIsOwner || viewerIsModerator)) {
    payload.inviteCode = circle.inviteCode ?? null;
  }

  res.json(payload);
});

// ---------- Join a circle ----------
const joinSchema = z.object({
  inviteCode: z.string().trim().optional(), // required for private
});

r.post("/:id/join", requireAuth, async (req: AuthedRequest, res) => {
  const idCheck = objectId.safeParse(req.params.id);
  if (!idCheck.success) return res.status(400).json({ error: "Invalid id" });

  const circle = await Circle.findById(idCheck.data);
  if (!circle) return res.status(404).json({ error: "Circle not found" });

  // Already a member
  if (circle.members.some((m) => normalizeId(m) === req.user!.id)) {
    return res.json({ ok: true, alreadyMember: true });
  }

  if (circle.visibility === "public") {
    await Circle.findByIdAndUpdate(circle._id, { $addToSet: { members: req.user!.id } });
    return res.json({ ok: true });
  }

  // private: require invite code
  const parsed = joinSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());

  if (!circle.inviteCode || parsed.data.inviteCode !== circle.inviteCode) {
    return res.status(403).json({ error: "Invalid or missing invite code" });
  }

  await Circle.findByIdAndUpdate(circle._id, { $addToSet: { members: req.user!.id } });
  res.json({ ok: true });
});

// ---------- Leave a circle (with deletion rule for empty private circles) ----------
r.post("/:id/leave", requireAuth, async (req: AuthedRequest, res) => {
  const idCheck = objectId.safeParse(req.params.id);
  if (!idCheck.success) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const circle: any = await Circle.findById(idCheck.data)
    .select("createdBy members visibility moderators")
    .lean();

  if (!circle) {
    return res.status(404).json({ error: "Circle not found" });
  }

  const userId = req.user!.id;

  const isMember =
    Array.isArray(circle.members) &&
    circle.members.some((m: any) => String(m) === userId);

  if (!isMember) {
    return res.status(400).json({ error: "You are not a member of this circle" });
  }

  // Members that would remain after this user leaves
  const remainingMembers = Array.isArray(circle.members)
    ? circle.members.filter((m: any) => String(m) !== userId)
    : [];

  // If a private circle would become empty, delete it completely
  if (circle.visibility === "private" && remainingMembers.length === 0) {
    await Circle.findByIdAndDelete(circle._id);
    return res.json({ ok: true, deleted: true });
  }

  // Owner cannot leave while other members remain
  if (String(circle.createdBy) === userId && remainingMembers.length > 0) {
    return res.status(400).json({
      error:
        "Owner cannot leave while other members remain. Delete the circle or transfer ownership.",
    });
  }

  // Normal leave: pull from members (and moderators, if present)
  await Circle.findByIdAndUpdate(circle._id, {
    $pull: {
      members: userId,
      moderators: userId,
    },
  });

  return res.json({ ok: true, deleted: false });
});

// ---------- Rotate invite code (owner only) ----------
r.post("/:id/rotate-invite", requireAuth, async (req: AuthedRequest, res) => {
  const idCheck = objectId.safeParse(req.params.id);
  if (!idCheck.success) return res.status(400).json({ error: "Invalid id" });

  const circle = await Circle.findById(idCheck.data).select("createdBy visibility").lean();
  if (!circle) return res.status(404).json({ error: "Circle not found" });
  if (String(circle.createdBy) !== req.user!.id)
    return res.status(403).json({ error: "Only the owner can rotate invite code" });

  if (circle.visibility !== "private") {
    await Circle.findByIdAndUpdate(circle._id, { $unset: { inviteCode: "" } });
    return res.json({ ok: true, inviteCode: null });
  }

  const inviteCode = await createUniqueInviteCode();
  try {
    await Circle.findByIdAndUpdate(circle._id, { inviteCode });
    res.json({ ok: true, inviteCode });
  } catch (err: any) {
    if (err?.code === 11000 && err?.keyPattern?.inviteCode) {
      return res.status(409).json({ error: "invite_code_conflict" });
    }
    throw err;
  }
});

// ---------- Update circle (owner only) ----------
const patchSchema = z.object({
  name: z.string().min(1).max(80).trim().optional(),
  description: z.string().max(240).trim().optional(),
  visibility: z.enum(["private", "public"]).optional(),
  addMembers: z.array(objectId).optional(),
  removeMembers: z.array(objectId).optional(),
});

r.patch("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const idCheck = objectId.safeParse(req.params.id);
  if (!idCheck.success) return res.status(400).json({ error: "Invalid id" });

  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());

  const circle = await Circle.findById(idCheck.data);
  if (!circle) return res.status(404).json({ error: "Circle not found" });
  if (String(circle.createdBy) !== req.user!.id)
    return res.status(403).json({ error: "Only the owner can modify this circle" });

  const updates: any = {};
  const ops: any = {};

  if (parsed.data.name) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.visibility) updates.visibility = parsed.data.visibility;

  if (parsed.data.addMembers?.length) {
    ops.$addToSet = { ...(ops.$addToSet || {}), members: { $each: parsed.data.addMembers } };
  }

  if (parsed.data.removeMembers?.length) {
    const toRemove = parsed.data.removeMembers.filter((m) => m !== String(circle.createdBy));
    if (toRemove.length) ops.$pullAll = { ...(ops.$pullAll || {}), members: toRemove };
  }

  if (parsed.data.visibility === "private" && !circle.inviteCode) {
    updates.inviteCode = await createUniqueInviteCode();
  }
  if (parsed.data.visibility === "public") {
    ops.$unset = { ...(ops.$unset || {}), inviteCode: "" };
  }

  const updated = await Circle.findByIdAndUpdate(
    circle._id,
    Object.keys(ops).length ? { ...updates, ...ops } : updates,
    { new: true, runValidators: true, select: "name description visibility createdBy members createdAt updatedAt" }
  ).lean({ virtuals: true });

  res.json(updated);
});

// ---------- Delete circle (owner only) ----------
r.delete("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const idCheck = objectId.safeParse(req.params.id);
  if (!idCheck.success) return res.status(400).json({ error: "Invalid id" });

  const circle = await Circle.findById(idCheck.data).select("createdBy").lean();
  if (!circle) return res.status(404).json({ error: "Circle not found" });
  if (String(circle.createdBy) !== req.user!.id)
    return res.status(403).json({ error: "Only the owner can delete this circle" });

  await Circle.findByIdAndDelete(circle._id);
  res.json({ ok: true });
});

// ==================== INVITATIONS ====================

// ---------- Send invitation ----------
const inviteSchema = z
  .object({
    userId: objectId.optional(),
    usernameOrEmail: z.string().min(2).max(120).trim().optional(),
  })
  .refine(
    (data) => Boolean(data.userId || data.usernameOrEmail),
    { message: "user_identifier_required" }
  );

r.post("/:id/invite", requireAuth, async (req: AuthedRequest, res) => {
  const idCheck = objectId.safeParse(req.params.id);
  if (!idCheck.success) return res.status(400).json({ error: "Invalid circle id" });

  if (!await isOwnerOrMod(idCheck.data, req.user!.id)) {
    return res.status(403).json({ error: "Only owner or moderators can send invitations" });
  }

  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.format());

  const circle = await Circle.findById(idCheck.data);
  if (!circle) return res.status(404).json({ error: "Circle not found" });

  let targetUserId = parsed.data.userId;
  let user = null;

  if (targetUserId) {
    user = await User.findById(targetUserId).select("_id");
  } else if (parsed.data.usernameOrEmail) {
    const lookupRaw = parsed.data.usernameOrEmail.trim();
    const usernameCandidate = lookupRaw.startsWith("@") ? lookupRaw.slice(1) : lookupRaw;
    const normalizedLookup = usernameCandidate.toLowerCase();
    const regex = new RegExp(`^${escapeRegex(lookupRaw)}$`, "i");
    user = await User.findOne({
      $or: [
        { email: lookupRaw.toLowerCase() },
        { username: normalizedLookup },
        { name: { $regex: regex } },
      ],
    }).select("_id name email username");
    if (user) targetUserId = user.id;
  }

  if (!user || !targetUserId) {
    return res.status(404).json({ error: "User not found" });
  }

  if (targetUserId === req.user!.id) {
    return res.status(400).json({ error: "You cannot invite yourself" });
  }

  if (circle.members.some(m => normalizeId(m) === targetUserId)) {
    return res.status(400).json({ error: "User is already a member" });
  }

  const existingInvite = await CircleInvitation.findOne({
    circleId: idCheck.data,
    inviteeId: targetUserId,
    status: "pending",
  });

  if (existingInvite) {
    return res.status(400).json({ error: "Pending invitation already exists" });
  }

  const invitation = await CircleInvitation.create({
    circleId: idCheck.data,
    inviteeId: targetUserId,
    invitedBy: req.user!.id,
    status: "pending",
  });

  res.status(201).json({ 
    message: "Invitation sent successfully",
    invitationId: invitation.id 
  });
});

// ---------- Accept invitation ----------
r.post("/:id/invite/accept", requireAuth, async (req: AuthedRequest, res) => {
  const idCheck = objectId.safeParse(req.params.id);
  if (!idCheck.success) return res.status(400).json({ error: "Invalid circle id" });

  const invitation = await CircleInvitation.findOne({
    circleId: idCheck.data,
    inviteeId: req.user!.id,
    status: "pending",
  });

  if (!invitation) {
    return res.status(404).json({ error: "No pending invitation found" });
  }

  if (invitation.expiresAt && invitation.expiresAt < new Date()) {
    invitation.status = "declined";
    await invitation.save();
    return res.status(400).json({ error: "Invitation has expired" });
  }

  const circle = await Circle.findById(idCheck.data);
  if (!circle) {
    return res.status(404).json({ error: "Circle not found" });
  }

  if (!circle.members.some(m => normalizeId(m) === req.user!.id)) {
    circle.members.push(new Types.ObjectId(req.user!.id));
    await circle.save();
  }

  invitation.status = "accepted";
  await invitation.save();

  res.json({ message: "Invitation accepted successfully" });
});

// ---------- Decline invitation ----------
r.post("/:id/invite/decline", requireAuth, async (req: AuthedRequest, res) => {
  const idCheck = objectId.safeParse(req.params.id);
  if (!idCheck.success) return res.status(400).json({ error: "Invalid circle id" });

  const invitation = await CircleInvitation.findOne({
    circleId: idCheck.data,
    inviteeId: req.user!.id,
    status: "pending",
  });

  if (!invitation) {
    return res.status(404).json({ error: "No pending invitation found" });
  }

  invitation.status = "declined";
  await invitation.save();

  res.json({ message: "Told them you hate them..." });
});

// ---------- List pending invitations (for circle owner/mod) ----------
r.get("/:id/invitations", requireAuth, async (req: AuthedRequest, res) => {
  const idCheck = objectId.safeParse(req.params.id);
  if (!idCheck.success) return res.status(400).json({ error: "Invalid circle id" });

  if (!await isOwnerOrMod(idCheck.data, req.user!.id)) {
    return res.status(403).json({ error: "Only owner or moderators can view invitations" });
  }

  const qp = paged.safeParse(req.query);
  if (!qp.success) return res.status(400).json(qp.error.format());
  const { page, limit } = qp.data;

  const statusFilter = req.query.status as string;
  const filter: any = { circleId: idCheck.data };
  
  if (statusFilter && ["pending", "accepted", "declined"].includes(statusFilter)) {
    filter.status = statusFilter;
  } else {
    filter.status = "pending";
  }

  const invitations = await CircleInvitation.find(filter)
    .populate("inviteeId", "name email")
    .populate("invitedBy", "name email")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const total = await CircleInvitation.countDocuments(filter);

  res.json({ 
    page, 
    limit, 
    total,
    items: invitations 
  });
});

// ---------- Get my pending invitations ----------
r.get("/invitations/me", requireAuth, async (req: AuthedRequest, res) => {
  const qp = paged.safeParse(req.query);
  if (!qp.success) return res.status(400).json(qp.error.format());
  const { page, limit } = qp.data;

  const invitations = await CircleInvitation.find({
    inviteeId: req.user!.id,
    status: "pending",
    expiresAt: { $gt: new Date() },
  })
    .populate("circleId", "name description visibility")
    .populate("invitedBy", "name email")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const total = await CircleInvitation.countDocuments({
    inviteeId: req.user!.id,
    status: "pending",
    expiresAt: { $gt: new Date() },
  });

  res.json({ 
    page, 
    limit, 
    total,
    items: invitations 
  });
});

// ==================== MEMBERS ====================

// ---------- List circle members ----------
r.get("/:id/members", requireAuth, async (req: AuthedRequest, res) => {
  const idCheck = objectId.safeParse(req.params.id);
  if (!idCheck.success) return res.status(400).json({ error: "Invalid circle id" });

  const circle = await Circle.findById(idCheck.data).lean();

  if (!circle) {
    return res.status(404).json({ error: "Circle not found" });
  }

  // Check membership
  const isMember = Array.isArray(circle.members) && circle.members.some((m: any) => normalizeId(m) === req.user!.id);

  // Private circles require membership to view members
  if (circle.visibility === "private" && !isMember) {
    return res.status(403).json({ error: "You must be a member to view members" });
  }

  const qp = paged.safeParse(req.query);
  if (!qp.success) return res.status(400).json(qp.error.format());
  const { page, limit } = qp.data;

  const skip = (page - 1) * limit;
  const memberIds = circle.members.slice(skip, skip + limit);

  const members = await User.find({ _id: { $in: memberIds } })
    .select("_id username avatarUrl")
    .lean();

  const ownerId = normalizeId(circle.createdBy);
  const enrichedMembers = members.map(member => {
    const memberId = normalizeId(member._id);
    const isModerator = circle.moderators?.some(mod => normalizeId(mod) === memberId) ?? false;
    return {
      id: memberId,
      username: member.username,
      avatarUrl: member.avatarUrl,
      isOwner: ownerId === memberId,
      isModerator,
      role: ownerId === memberId ? "owner" : isModerator ? "moderator" : "member",
    };
  });

  res.json({ 
    page, 
    limit, 
    total: circle.members.length,
    items: enrichedMembers 
  });
});

// ---------- Remove member ----------
r.delete("/:id/members/:userId", requireAuth, async (req: AuthedRequest, res) => {
  const idCheck = objectId.safeParse(req.params.id);
  const userIdCheck = objectId.safeParse(req.params.userId);
  
  if (!idCheck.success || !userIdCheck.success) {
    return res.status(400).json({ error: "Invalid id" });
  }

  if (!await isOwnerOrMod(idCheck.data, req.user!.id)) {
    return res.status(403).json({ error: "Only owner or moderators can remove members" });
  }

  const circle = await Circle.findById(idCheck.data);
  if (!circle) return res.status(404).json({ error: "Circle not found" });

  const ownerId = normalizeId(circle.createdBy);
  if (ownerId === userIdCheck.data) {
    return res.status(400).json({ error: "Cannot remove the circle owner" });
  }

  const isRequesterOwner = ownerId === req.user!.id;
  const isTargetModerator = circle.moderators?.some(mod => normalizeId(mod) === userIdCheck.data) ?? false;

  if (isTargetModerator && !isRequesterOwner) {
    return res.status(403).json({ error: "Only the owner can remove moderators" });
  }

  const updated = await Circle.findByIdAndUpdate(
    idCheck.data,
    { 
      $pull: { 
        members: userIdCheck.data,
        moderators: userIdCheck.data
      } 
    },
    { new: true }
  );

  if (!updated) return res.status(404).json({ error: "Circle not found" });

  res.json({ message: "Member removed successfully" });
});

// ==================== MODERATORS ====================

// ---------- Add moderator ----------
r.post("/:id/mods/:userId", requireAuth, async (req: AuthedRequest, res) => {
  const idCheck = objectId.safeParse(req.params.id);
  const userIdCheck = objectId.safeParse(req.params.userId);
  
  if (!idCheck.success || !userIdCheck.success) {
    return res.status(400).json({ error: "Invalid id" });
  }

  if (!await isOwner(idCheck.data, req.user!.id)) {
    return res.status(403).json({ error: "Only the owner can add moderators" });
  }

  const circle = await Circle.findById(idCheck.data);
  if (!circle) return res.status(404).json({ error: "Circle not found" });

  if (!circle.members.some(m => normalizeId(m) === userIdCheck.data)) {
    circle.members.push(new Types.ObjectId(userIdCheck.data));
  }

  if (circle.moderators?.some(mod => normalizeId(mod) === userIdCheck.data)) {
    return res.status(400).json({ error: "User is already a moderator" });
  }

  await Circle.findByIdAndUpdate(
    idCheck.data,
    { 
      $addToSet: { 
        moderators: userIdCheck.data,
        members: userIdCheck.data
      }
    }
  );

  res.json({ message: "Moderator added successfully" });
});

// ---------- Remove moderator ----------
r.delete("/:id/mods/:userId", requireAuth, async (req: AuthedRequest, res) => {
  const idCheck = objectId.safeParse(req.params.id);
  const userIdCheck = objectId.safeParse(req.params.userId);
  
  if (!idCheck.success || !userIdCheck.success) {
    return res.status(400).json({ error: "Invalid id" });
  }

  if (!await isOwner(idCheck.data, req.user!.id)) {
    return res.status(403).json({ error: "Only the owner can remove moderators" });
  }

  await Circle.findByIdAndUpdate(
    idCheck.data,
    { $pull: { moderators: userIdCheck.data } }
  );

  res.json({ message: "Moderator removed successfully" });
});




export default r;
