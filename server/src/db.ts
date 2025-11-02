
// server/src/db.ts
import mongoose from "mongoose";
import { env } from "./config/env";

let dbReady = false;
let listenersAttached = false;

export function isDbReady() {
  return dbReady;
}

export function mongoState() {
  // 0=disconnected,1=connected,2=connecting,3=disconnecting
  return mongoose.connection.readyState;
}

export async function connectToDB() {
  if (!env.MONGODB_URI) throw new Error("MONGODB_URI missing");

  // Avoid duplicate connects on ts-node-dev hot reload
  if (mongoose.connection.readyState === 1) {
    dbReady = true;
    return mongoose.connection;
  }
  if (mongoose.connection.readyState === 2) {
    return mongoose.connection;
  }

  // Safer defaults
  mongoose.set("autoIndex", env.NODE_ENV !== "production");
  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(env.MONGODB_URI, {
      // Keep defaults minimal to avoid deprecations across driver versions
      serverSelectionTimeoutMS: 10000,
    } as any);

    dbReady = true;
    console.log("[DB] Connected");

    if (!listenersAttached) {
      listenersAttached = true;

      mongoose.connection.on("error", (e) => {
        dbReady = false;
        console.error("[DB] Connection error:", e?.message || e);
      });

      mongoose.connection.on("disconnected", () => {
        dbReady = false;
        console.error("[DB] Disconnected");
      });

      mongoose.connection.on("reconnected", () => {
        dbReady = true;
        console.log("[DB] Reconnected");
      });
    }

    return mongoose.connection;
  } catch (err) {
    dbReady = false;
    console.error("[DB] Initial connect error:", err);
    // Do not throw: app can still serve /health and return 503 on others
    return mongoose.connection;
  }
}

export async function closeDB() {
  dbReady = false;
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}