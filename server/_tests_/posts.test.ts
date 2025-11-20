
// _tests_/posts.test.ts
// @ts-nocheck

import express from "express";
import request from "supertest";

// ---------- Mocks ----------

// Mock Post model
jest.mock("../src/models/Post", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

// Mock Circle model
jest.mock("../src/models/Circles/Circle", () => ({
  __esModule: true,
  default: {
    countDocuments: jest.fn(),
    exists: jest.fn(),
  },
}));

// Mock Viewing model
jest.mock("../src/models/Viewing", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
  },
}));

// Mock auth middleware so every request is "logged in"
jest.mock("../src/middleware/auth", () => ({
  __esModule: true,
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: "user-1" };
    next();
  },
}));

// Mock validate middleware to just copy req → res.locals
jest.mock("../src/middleware/validate", () => ({
  __esModule: true,
  validateBody:
    (_schema: any) =>
    (req: any, res: any, next: any) => {
      res.locals.body = req.body || {};
      next();
    },
  validateQuery:
    (_schema: any) =>
    (req: any, res: any, next: any) => {
      res.locals.query = req.query || {};
      next();
    },
  validateParams:
    (_schema: any) =>
    (req: any, res: any, next: any) => {
      res.locals.params = req.params || {};
      next();
    },
}));

// Mock asyncHandler to unwrap async functions
jest.mock("../src/middleware/asyncHandler", () => ({
  __esModule: true,
  asyncHandler:
    (fn: any) =>
    (req: any, res: any, next: any) =>
      Promise.resolve(fn(req, res, next)).catch(next),
}));

import postsRouter from "../src/routes/posts";
import Post from "../src/models/Post";
import Circle from "../src/models/Circles/Circle";
import Viewing from "../src/models/Viewing";

describe("Posts routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use("/posts", postsRouter);
  });

  // Helper to build a chainable query for Post.find()
  function makeFindQuery(result: any) {
    return {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(result),
    };
  }

  // Helper for Post.findById(...).select(...).lean()
  function makeFindByIdLeanQuery(result: any) {
    return {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(result),
    };
  }

  // -------------------- CREATE POST --------------------

  it("creates a post with rating and records a viewing", async () => {
    (Circle as any).countDocuments.mockResolvedValue(1);
    (Post as any).create.mockResolvedValue({ id: "post-1" });
    (Viewing as any).create.mockResolvedValue({});

    const res = await request(app).post("/posts").send({
      type: "movie",
      tmdbId: "12345",
      circles: ["circle-1"],
      rating: 5,
      comment: "Great movie!",
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("post-1");
    expect(Post.create).toHaveBeenCalled();
    expect(Viewing.create).toHaveBeenCalled();
  });

  it("creates a post with only a comment", async () => {
    (Circle as any).countDocuments.mockResolvedValue(1);
    (Post as any).create.mockResolvedValue({ id: "post-2" });
    (Viewing as any).create.mockResolvedValue({});

    const res = await request(app).post("/posts").send({
      type: "movie",
      tmdbId: "999",
      circles: ["circle-1"],
      comment: "Watched but didn't rate.",
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("post-2");
  });

  it("returns 403 when not in all circles", async () => {
    (Circle as any).countDocuments.mockResolvedValue(0);

    const res = await request(app).post("/posts").send({
      type: "movie",
      tmdbId: "22",
      circles: ["c1", "c2"],
      rating: 4,
    });

    expect(res.status).toBe(403);
    expect(Post.create).not.toHaveBeenCalled();
  });

  // -------------------- LIST POSTS IN CIRCLE --------------------

  it("403 if requesting posts of a circle user does not belong to", async () => {
    (Circle as any).exists.mockResolvedValue(null);

    const res = await request(app).get("/posts/circle/circle-1");

    expect(res.status).toBe(403);
  });

  it("lists posts in circle if user is a member", async () => {
    (Circle as any).exists.mockResolvedValue({ _id: "circle-1" });

    const fakePosts = [
      { _id: "p1", type: "movie", tmdbId: "123" },
      { _id: "p2", type: "tv", tmdbId: "444" },
    ];

    (Post as any).find.mockReturnValue(makeFindQuery(fakePosts));

    const res = await request(app).get("/posts/circle/circle-1?page=1&limit=10");

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(2);
  });

  it("returns empty posts list in circle", async () => {
    (Circle as any).exists.mockResolvedValue({ _id: "circle-1" });
    (Post as any).find.mockReturnValue(makeFindQuery([]));

    const res = await request(app).get("/posts/circle/circle-1?page=2&limit=5");

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  // -------------------- LIST MY POSTS --------------------

  it("lists my posts", async () => {
    const posts = [
      { _id: "my1", authorId: "user-1" },
      { _id: "my2", authorId: "user-1" },
    ];

    (Post as any).find.mockReturnValue(makeFindQuery(posts));

    const res = await request(app).get("/posts/me?page=1&limit=20");

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(2);
  });

  it("returns empty my posts list", async () => {
    (Post as any).find.mockReturnValue(makeFindQuery([]));

    const res = await request(app).get("/posts/me?page=1&limit=20");

    expect(res.body.items).toEqual([]);
  });

  // -------------------- EDIT POST --------------------

  it("404 when editing non-existent post", async () => {
    (Post as any).findById.mockResolvedValue(null);

    const res = await request(app).patch("/posts/p404").send({ rating: 5 });

    expect(res.status).toBe(404);
  });

  it("403 when editing another user's post", async () => {
    (Post as any).findById.mockResolvedValue({ authorId: "other-user" });

    const res = await request(app).patch("/posts/p1").send({ rating: 5 });

    expect(res.status).toBe(403);
  });

  it("successfully edits a post", async () => {
    const saveMock = jest.fn();

    const fakePost = {
      _id: "p1",
      authorId: "user-1",
      rating: 3,
      comment: "old",
      set(field, val) {
        this[field] = val;
      },
      get(field) {
        return this[field];
      },
      save: saveMock,
    };

    (Post as any).findById.mockResolvedValue(fakePost);

    const res = await request(app).patch("/posts/p1").send({
      rating: 5,
      comment: "updated",
    });

    expect(res.status).toBe(200);
    expect(fakePost.rating).toBe(5);
    expect(fakePost.comment).toBe("updated");
    expect(saveMock).toHaveBeenCalled();
  });

  // Fatal edit validation case
  it("400 when both rating and comment become empty", async () => {
    const fakePost = {
      _id: "p2",
      authorId: "user-1",
      rating: 3,
      comment: "text",
      set(field, val) {
        this[field] = val;
      },
      get(field) {
        return this[field];
      },
      save: jest.fn(),
    };

    (Post as any).findById.mockResolvedValue(fakePost);

    const res = await request(app)
      .patch("/posts/p2")
      .send({ rating: null, comment: null });

    expect(res.status).toBe(400);
  });

  // EpisodeNumber without seasonNumber
  it("400 when episode provided without season in edit", async () => {
    const fakePost = {
      _id: "p3",
      authorId: "user-1",
      rating: 4,
      comment: "ok",
      seasonNumber: null,
      episodeNumber: null,
      set(field, val) {
        this[field] = val;
      },
      get(field) {
        return this[field];
      },
      save: jest.fn(),
    };

    (Post as any).findById.mockResolvedValue(fakePost);

    const res = await request(app).patch("/posts/p3").send({
      episodeNumber: 2,
    });

    expect(res.status).toBe(400);
  });

  // -------------------- DELETE POST --------------------

  it("404 when deleting non-existent post", async () => {
    (Post as any).findById.mockReturnValue(makeFindByIdLeanQuery(null));

    const res = await request(app).delete("/posts/p404");

    expect(res.status).toBe(404);
  });

  it("403 when deleting another user's post", async () => {
    (Post as any).findById.mockReturnValue(
      makeFindByIdLeanQuery({ authorId: "other-user" })
    );

    const res = await request(app).delete("/posts/p1");

    expect(res.status).toBe(403);
  });

  it("successfully deletes post", async () => {
    (Post as any).findById.mockReturnValue(
      makeFindByIdLeanQuery({ authorId: "user-1" })
    );

    (Post as any).findByIdAndDelete.mockResolvedValue({});

    const res = await request(app).delete("/posts/p1");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("delete succeeds even if DB returns null", async () => {
    (Post as any).findById.mockReturnValue(
      makeFindByIdLeanQuery({ authorId: "user-1" })
    );

    (Post as any).findByIdAndDelete.mockResolvedValue(null);

    const res = await request(app).delete("/posts/p2");

    expect(res.status).toBe(200);
  });
});