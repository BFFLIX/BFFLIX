// _tests_/circles.test.ts
// @ts-nocheck

import express from "express";
import request from "supertest";
import circlesRouter from "../src/routes/circles";

// --------- Mocks ---------

jest.mock("../src/models/user", () => ({
  __esModule: true,
  default: {
    countDocuments: jest.fn(),
    find: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.mock("../src/models/Circles/Circle", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    create: jest.fn(),
    exists: jest.fn(),
  },
}));

jest.mock("../src/models/Circles/CircleInvitation", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    create: jest.fn(),
  },
}));

// Mock auth middleware so every request is "logged in" as user-1
jest.mock("../src/middleware/auth", () => ({
  __esModule: true,
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: "user-1" };
    next();
  },
}));

import User from "../src/models/user";
import Circle from "../src/models/Circles/Circle";
import CircleInvitation from "../src/models/Circles/CircleInvitation";

describe("Circle routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use("/circles", circlesRouter);
  });

  // ---------- Helper to build a chainable Mongoose-like query ----------
  function makeFindQuery(result: any) {
    return {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(result),
    };
  }

  // ---------- CREATE CIRCLE ----------

  it("returns 400 when create payload is invalid", async () => {
    const res = await request(app).post("/circles/").send({
      // Missing 'name', so Zod should fail
      description: "no name here",
    });

    expect(res.status).toBe(400);
  });

  it("creates a private circle and returns its id", async () => {
    // Uniq members is [req.user.id], so countDocuments should be 1
    (User as any).countDocuments.mockResolvedValue(1);

    // createUniqueInviteCode will call Circle.exists
    (Circle as any).exists.mockResolvedValue(false);

    (Circle as any).create.mockResolvedValue({
      id: "circle-1",
    });

    const res = await request(app).post("/circles/").send({
      name: "My Circle",
      description: "Test circle",
      // visibility omitted -> defaults to private
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("circle-1");
    expect((Circle as any).create).toHaveBeenCalled();
  });

  // ---------- LIST MY CIRCLES ----------

  it("lists my circles with basic fields mapped", async () => {
    const fakeCircles = [
      {
        _id: "507f1f77bcf86cd799439011",
        name: "Circle One",
        description: "First circle",
        visibility: "public",
        createdBy: "user-1",
        members: ["user-1", "user-2"],
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-02"),
      },
    ];

    (Circle as any).find.mockReturnValue(makeFindQuery(fakeCircles));

    const res = await request(app)
      .get("/circles")
      .query({ page: 1, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      id: "507f1f77bcf86cd799439011",
      name: "Circle One",
      description: "First circle",
      visibility: "public",
      membersCount: 2,
    });
  });

  // ---------- JOIN PUBLIC CIRCLE ----------

  it("allows joining a public circle", async () => {
    // Valid ObjectId for :id
    const circleId = "507f1f77bcf86cd799439011";

    (Circle as any).findById.mockResolvedValue({
      _id: circleId,
      visibility: "public",
      members: [],
    });

    (Circle as any).findByIdAndUpdate.mockResolvedValue(null);

    const res = await request(app)
      .post(`/circles/${circleId}/join`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect((Circle as any).findByIdAndUpdate).toHaveBeenCalledWith(
      circleId,
      { $addToSet: { members: "user-1" } },
    );
  });

  // ---------- LEAVE PRIVATE CIRCLE (DELETES WHEN EMPTY) ----------

  it("deletes a private circle when the last member leaves", async () => {
    const circleId = "507f1f77bcf86cd799439011";

    // Circle.findById(...).select(...).lean()
    const findByIdQuery = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        _id: circleId,
        createdBy: "user-1",
        visibility: "private",
        members: ["user-1"],
        moderators: [],
      }),
    };

    (Circle as any).findById.mockReturnValue(findByIdQuery);
    (Circle as any).findByIdAndDelete = jest.fn().mockResolvedValue(null);

    const res = await request(app)
      .post(`/circles/${circleId}/leave`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ok: true, deleted: true });
    expect((Circle as any).findByIdAndDelete).toHaveBeenCalledWith(circleId);
  });
});