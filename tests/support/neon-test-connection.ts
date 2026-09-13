import { setTimeout as delay } from "node:timers/promises";
import type { Pool } from "pg";

function isTransientDatabaseConnectionError(error: unknown) {
  let current: unknown = error;
  const messages: string[] = [];
  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (current instanceof Error) messages.push(current.message);
    if (typeof current === "object" && current !== null && "code" in current) {
      messages.push(String((current as { code?: unknown }).code ?? ""));
    }
    current =
      typeof current === "object" && current !== null && "cause" in current
        ? (current as { cause?: unknown }).cause
        : null;
  }
  return /ECONNRESET|UND_ERR_CONNECT_TIMEOUT|fetch failed|connection timeout|socket disconnected/i.test(
    messages.join(" "),
  );
}

export async function retryTransientDatabaseConnection<T>(
  operation: () => Promise<T>,
  attempts = 5,
): Promise<T> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransientDatabaseConnectionError(error) || attempt === attempts) {
        throw error;
      }
      await delay(attempt * 250);
    }
  }
  throw new Error("Tentatives de connexion Neon épuisées.");
}

export function warmNeonTestPool(pool: Pool) {
  return retryTransientDatabaseConnection(() => pool.query("SELECT 1"));
}

export async function warmApplicationDatabaseConnections() {
  const [{ sql }, { db }, { transactionalDb }] = await Promise.all([
    import("drizzle-orm"),
    import("@/infrastructure/db"),
    import("@/infrastructure/db/transaction"),
  ]);
  await retryTransientDatabaseConnection(() => db.execute(sql`SELECT 1`));
  await retryTransientDatabaseConnection(() =>
    transactionalDb.execute(sql`SELECT 1`),
  );
}
