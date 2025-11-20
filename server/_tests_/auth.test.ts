// src/routes/auth.test.ts
// @ts-nocheck

import express from "express";
import request from "supertest";
import authRouter from "../src/routes/auth";

// Mocks for models and helper libs

jest.mock("../src/models/user", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  },
}));

jest.mock("../src/models/PasswordReset", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

jest.mock("../src/models/EmailVerification", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

jest.mock("../src/lib/jwt", () => ({
  __esModule: true,
  signToken: jest.fn(() => "fake-jwt-token"),
}));

jest.mock("../src/lib/resetToken", () => ({
  __esModule: true,
  generateToken: jest.fn(() => "raw-reset-token"),
  hashToken: jest.fn((v: string) => `hashed-${v}`),
}));

jest.mock("../src/lib/mailer", () => ({
  __esModule: true,
  sendPasswordResetEmail: jest.fn(async () => {}),
  sendVerificationEmail: jest.fn(async () => {}),
}));

jest.mock("../src/lib/password", () => ({
  __esModule: true,
  validatePassword: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
  __esModule: true,
  default: {
    hash: jest.fn(async () => "hashed-password"),
    compare: jest.fn(async () => true),
  },
}));

import User from "../src/models/user";
import PasswordReset from "../src/models/PasswordReset";
import EmailVerification from "../src/models/EmailVerification";
import { validatePassword } from "../src/lib/password";
import { signToken } from "../src/lib/jwt";

describe("Auth routes", () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use("/auth", authRouter);

    // Default password validator to strong password
    (validatePassword as jest.Mock).mockReturnValue({
      ok: true,
      score: 4,
      errors: [],
    });
  });

  // ---------- SIGNUP ----------

  it("returns 400 for invalid signup payload", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({
        email: "not-an-email",
        password: "123",
        name: "",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
  });

  it("returns weak_password when validatePassword fails on signup", async () => {
    (validatePassword as jest.Mock).mockReturnValueOnce({
      ok: false,
      score: 1,
      errors: ["Too weak"],
    });

    const res = await request(app)
      .post("/auth/signup")
      .send({
        email: "test@example.com",
        password: "Password1",
        name: "Test User",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("weak_password");
    expect(res.body.details).toContain("Too weak");
  });

  it("creates a user on valid signup", async () => {
    const mockUser = {
      _id: "user-id-1",
      email: "test@example.com",
      name: "Test User",
    };

    (User as any).findOne.mockResolvedValue(null);
    (User as any).create.mockResolvedValue(mockUser);

    const res = await request(app)
      .post("/auth/signup")
      .send({
        email: "test@example.com",
        password: "Password1",
        name: "Test User",
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.user.email).toBe("test@example.com");
    expect((User as any).create).toHaveBeenCalled();
  });

  // ---------- LOGIN ----------

  it("returns invalid_credentials when user is not found", async () => {
    (User as any).findOne.mockResolvedValue(null);

    const res = await request(app)
      .post("/auth/login")
      .send({
        email: "unknown@example.com",
        password: "Password1",
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("invalid_credentials");
  });

  it("returns email_not_verified when user exists but is not verified", async () => {
    (User as any).findOne.mockResolvedValue({
      _id: "user-id-1",
      email: "test@example.com",
      name: "Test User",
      passwordHash: "hashed-password",
      isVerified: false,
      failedLoginCount: 0,
      save: jest.fn(),
    });

    const res = await request(app)
      .post("/auth/login")
      .send({
        email: "test@example.com",
        password: "Password1",
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("email_not_verified");
  });

  it("logs in a verified user and returns a token + cookie", async () => {
    const mockSave = jest.fn();

    (User as any).findOne.mockResolvedValue({
      _id: "user-id-1",
      email: "test@example.com",
      name: "Test User",
      username: "testuser",
      passwordHash: "hashed-password",
      isVerified: true,
      failedLoginCount: 0,
      lockUntil: null,
      tokenVersion: 0,
      save: mockSave,
    });

    const res = await request(app)
      .post("/auth/login")
      .send({
        email: "test@example.com",
        password: "Password1",
      });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("test@example.com");
    expect(res.body.token).toBe("fake-jwt-token");
    expect(signToken).toHaveBeenCalled();
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  // ---------- PASSWORD STRENGTH ----------

  it("password-strength returns score and details", async () => {
    (validatePassword as jest.Mock).mockReturnValueOnce({
      ok: false,
      score: 1,
      errors: ["Needs more length"],
    });

    const res = await request(app)
      .post("/auth/password-strength")
      .send({
        password: "abc",
        email: "test@example.com",
        name: "Test User",
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(false);
    expect(res.body.score).toBe(1);
    expect(res.body.details).toContain("Needs more length");
  });

  // ---------- VERIFY EMAIL BY TOKEN ----------

  it("verify-email returns ok when given valid token", async () => {
    (EmailVerification as any).findOne.mockResolvedValue({
      userId: "user-id-1",
      usedAt: null,
      expiresAt: new Date(Date.now() + 60 * 1000),
      save: jest.fn(),
    });

    const mockUserSave = jest.fn();
    (User as any).findById.mockResolvedValue({
      _id: "user-id-1",
      email: "test@example.com",
      isVerified: false,
      save: mockUserSave,
    });

    const res = await request(app)
      .post("/auth/verify-email")
      .send({ token: "some-valid-token" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(mockUserSave).toHaveBeenCalled();
  });
});