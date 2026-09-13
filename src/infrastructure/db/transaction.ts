import { env } from "@/infrastructure/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForSubscriptionDb = globalThis as typeof globalThis & {
  subscriptionPool?: Pool;
};
const constrainedTestDatabase =
  process.env.E2E_TEST === "true" ||
  process.env.ALLOW_DEVELOPMENT_DB_TESTS === "true";

// Le pilote neon-http utilisé pour les lectures et les batchs ne prend pas en
// charge les transactions interactives. Les transitions d'abonnement ont
// besoin de verrous et de lectures dépendantes : elles passent donc par ce
// pool PostgreSQL, sur la même base et le même schéma.
const pool =
  globalForSubscriptionDb.subscriptionPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: constrainedTestDatabase ? 1 : 3,
    idleTimeoutMillis: constrainedTestDatabase ? 60_000 : 10_000,
    connectionTimeoutMillis: constrainedTestDatabase ? 30_000 : 10_000,
    keepAlive: constrainedTestDatabase,
  });

if (process.env.NODE_ENV !== "production") {
  globalForSubscriptionDb.subscriptionPool = pool;
}

export const transactionalDb = drizzle(pool, { schema });

export type TransactionExecutor = Parameters<
  Parameters<typeof transactionalDb.transaction>[0]
>[0];

/** Executor minimalement concret : client applicatif ou transaction Drizzle active. */
export type DbExecutor = typeof import("./client").db | TransactionExecutor;
