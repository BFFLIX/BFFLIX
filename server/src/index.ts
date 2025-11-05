
// server/src/index.ts
import "dotenv/config"; // Don't remove this line
import express from "express";
import cors from "cors";
import helmet from "helmet";

import { env } from "./config/env";
import { connectToDB, isDbReady } from "./db";
import { requireDbReady } from "./middleware/ensureDb";
import { requireJson } from "./middleware/contentType";

import streamingServiceRoutes from "./routes/streamingService.routes";
import circleRouter from "./routes/circles";
import postsRouter from "./routes/posts";
import authRouter from "./routes/auth";
import { authLimiter } from "./middleware/rateLimit";
import meRouter from "./routes/me";
import agentRouter from "./routes/agent";
import viewingsRouter from "./routes/viewings";
import tmdbRouter from "./routes/tmdb.routes";
import feedRouter from "./routes/feed";

const app = express();

// Security + platform defaults
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
// Public endpoints first (should work even if DB is down)
app.get("/", (_req, res) => {
  res.send("🎬 BFFlix API is running! Try /health for a status check.");
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    env: env.NODE_ENV,
    db: isDbReady() ? "connected" : "disconnected",
    time: new Date().toISOString(),
  });
});

// Enforce JSON on mutating routes (skip / and /health)
app.use(requireJson);

// Block everything below until DB is ready
app.use(requireDbReady);

// Routes (now safely gated by DB readiness)
app.use("/auth", authLimiter, authRouter); // limiter on auth only
app.use("/me", meRouter);
app.use("/circles", circleRouter);
app.use("/posts", postsRouter);
app.use("/api", streamingServiceRoutes);
app.use("/agent", agentRouter);
app.use("/viewings", viewingsRouter);
app.use("/tmdb", tmdbRouter);
app.use("/feed", feedRouter);

// Global error handler
app.use((
  err: any,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction
) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "payload_too_large" });
  }
  console.error("[Unhandled Error]", err);
  res.status(500).json({ error: "internal_error" });
});

// Boot
(async () => {
  await connectToDB(); // uses env.MONGODB_URI internally
  app.listen(env.PORT, () => {
    console.log(`🚀 BFFlix API on http://localhost:${env.PORT}`);
  });
})();