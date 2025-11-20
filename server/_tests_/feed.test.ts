
// _tests_/feed.test.ts
// @ts-nocheck

import express from "express";
import request from "supertest";
import feedRouter from "../src/routes/feed";

// ---------- Mocks ----------

// Mock User model
jest.mock("../src/models/user", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

// Mock Circle model
jest.mock("../src/models/Circles/Circle", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));

// We will not reach Post / Like / Comment, so no need to mock them

// Mock auth middleware so every request is "logged in"
jest.mock("../src/middleware/auth", () => ({
  __esModule: true,
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: "user-1" };
    next();
  },
}));

// Mock validateQuery to just pass through and copy query into res.locals
jest.mock("../src/middleware/validate", () => ({
  __esModule: true,
  validateQuery:
    (_schema: any) => (req: any, res: any, next: any) => {
      res.locals.query = req.query || {};
      next();
    },
}));

// Mock asyncHandler to run the handler and forward errors to next
jest.mock("../src/middleware/asyncHandler", () => ({
  __esModule: true,
  asyncHandler:
    (fn: any) => (req: any, res: any, next: any) =>
      Promise.resolve(fn(req, res, next)).catch(next),
}));

// Mock cursor helpers (we do not really use them in this test)
jest.mock("../src/lib/cursor", () => ({
  __esModule: true,
  makeCursor: jest.fn(() => "dummy-cursor"),
  parseCursor: jest.fn(() => null),
}));

import User from "../src/models/user";
import Circle from "../src/models/Circles/Circle";

describe("Feed route", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use("/feed", feedRouter);
  });

  it("returns an empty feed when user is in no circles", async () => {
    // User has some services (or none, does not really matter for this test)
    (User as any).findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ services: [] }),
    });

    // No circles for this user
    (Circle as any).find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });

    const res = await request(app).get("/feed").query({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      items: [],
      nextCursor: null,
    });
  });
});