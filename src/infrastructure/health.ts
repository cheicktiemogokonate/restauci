import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/infrastructure/db";
import { redis } from "@/infrastructure/cache/redis";

export interface DependencyHealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    database: { status: "up" | "down"; latency?: number };
    cache: { status: "up" | "down"; latency?: number };
  };
}

export async function checkDependencyHealth(): Promise<DependencyHealthStatus> {
  const status: DependencyHealthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      database: { status: "down" },
      cache: { status: "down" },
    },
  };

  try {
    const startedAt = performance.now();
    await Promise.race([
      db.execute(sql`SELECT 1`),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("DB timeout")), 3_000),
      ),
    ]);
    status.services.database = {
      status: "up",
      latency: Math.round(performance.now() - startedAt),
    };
  } catch {
    status.status = "degraded";
  }

  try {
    const startedAt = performance.now();
    await Promise.race([
      redis.ping(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Cache timeout")), 1_000),
      ),
    ]);
    status.services.cache = {
      status: "up",
      latency: Math.round(performance.now() - startedAt),
    };
  } catch {
    status.status = "degraded";
  }

  if (status.services.database.status === "down") {
    status.status = "unhealthy";
  }
  return status;
}
