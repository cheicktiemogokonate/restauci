import { env } from "@/lib/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForSubscriptionDb = globalThis as typeof globalThis & {
  subscriptionPool?: Pool;
};

// Le pilote neon-http utilisé pour les lectures et les batchs ne prend pas en
// charge les transactions interactives. Les transitions d'abonnement ont
// besoin de verrous et de lectures dépendantes : elles passent donc par ce
// pool PostgreSQL, sur la même base et le même schéma.
const pool =
  globalForSubscriptionDb.subscriptionPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForSubscriptionDb.subscriptionPool = pool;
}

export const transactionalDb = drizzle(pool, { schema });

export type TransactionExecutor = Parameters<
  Parameters<typeof transactionalDb.transaction>[0]
>[0];

/** Executor minimalement concret : client applicatif ou transaction Drizzle active. */
export type DbExecutor = typeof import("./index").db | TransactionExecutor;
