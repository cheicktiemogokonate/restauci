import { env } from "@/lib/env";
import { neon } from "@neondatabase/serverless";
import { drizzle as neonDrizzle } from "drizzle-orm/neon-http";
import { drizzle as postgresDrizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type AppDatabase = ReturnType<typeof neonDrizzle<typeof schema>>;

function createDatabase(): AppDatabase {
  if (process.env.E2E_TEST === "true") {
    const globalForE2eDatabase = globalThis as typeof globalThis & {
      __restauCiE2ePool?: Pool;
    };
    const pool =
      globalForE2eDatabase.__restauCiE2ePool ??
      new Pool({
        connectionString: env.DATABASE_URL,
        max: 5,
        connectionTimeoutMillis: 15_000,
      });
    globalForE2eDatabase.__restauCiE2ePool = pool;
    return postgresDrizzle(pool, { schema }) as unknown as AppDatabase;
  }

  return neonDrizzle(neon(env.DATABASE_URL), { schema });
}

export const db = createDatabase();
export type DB = typeof db;

type ReadQuery = PromiseLike<unknown>;
type AwaitedReadTuple<T extends readonly ReadQuery[]> = {
  -readonly [K in keyof T]: Awaited<T[K]>;
};

/**
 * Execute independent read queries together.
 *
 * Neon HTTP exposes `db.batch`, while the node-postgres adapter used by the
 * browser test harness does not. Keeping that compatibility here lets E2E
 * exercise the same read models without weakening the atomic write batches.
 */
export function batchRead<const T extends readonly [ReadQuery, ...ReadQuery[]]>(
  queries: T,
): Promise<AwaitedReadTuple<T>> {
  if (process.env.E2E_TEST === "true") {
    return Promise.all(queries) as Promise<AwaitedReadTuple<T>>;
  }

  return db.batch(
    queries as unknown as Parameters<AppDatabase["batch"]>[0],
  ) as unknown as Promise<AwaitedReadTuple<T>>;
}
