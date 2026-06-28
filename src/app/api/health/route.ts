import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { redis } from "@/lib/cache/redis";
import { sql } from "drizzle-orm";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  services: {
    database: { status: "up" | "down"; latency?: number };
    cache: { status: "up" | "down"; latency?: number };
  };
}

export async function GET() {
  const status: HealthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
    services: {
      database: { status: "down" },
      cache: { status: "down" },
    },
  };

  // Vérifier la DB (timeout 3s)
  try {
    const dbStart = performance.now();
    await Promise.race([
      db.execute(sql`SELECT 1`),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("DB timeout")), 3000)
      ),
    ]);
    status.services.database = {
      status: "up",
      latency: Math.round(performance.now() - dbStart),
    };
  } catch {
    status.services.database = { status: "down" };
    status.status = "degraded";
  }

  // Vérifier Redis (timeout 1s)
  try {
    const cacheStart = performance.now();
    await Promise.race([
      redis.ping(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Cache timeout")), 1000)
      ),
    ]);
    status.services.cache = {
      status: "up",
      latency: Math.round(performance.now() - cacheStart),
    };
  } catch {
    status.services.cache = { status: "down" };
    if (status.status === "healthy") status.status = "degraded";
  }

  // Si DB est down → unhealthy
  if (status.services.database.status === "down") {
    status.status = "unhealthy";
  }

  const httpStatus =
    status.status === "healthy"
      ? 200
      : status.status === "degraded"
        ? 200
        : 503;

  return NextResponse.json(status, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}