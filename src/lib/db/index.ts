import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "./schema"
import { env } from "@/lib/env"

/**
 * pg v8 treats sslmode=require/prefer/verify-ca as verify-full aliases and warns
 * about the upcoming pg v9 behavior change. Normalizing avoids the console warning.
 */
function normalizeDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const sslmode = parsed.searchParams.get("sslmode")

    if (
      sslmode === "prefer" ||
      sslmode === "require" ||
      sslmode === "verify-ca"
    ) {
      parsed.searchParams.set("sslmode", "verify-full")
    }

    return parsed.toString()
  } catch {
    return url
  }
}

const connectionString = normalizeDatabaseUrl(env.DATABASE_URL)

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("sslmode=")
    ? { rejectUnauthorized: false }
    : env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
})

export const db = drizzle(pool, { schema })
export { pool }

// import { drizzle } from "drizzle-orm/neon-http";
// import { neon } from "@neondatabase/serverless";
// import * as schema from "./schema";

// if (!process.env.DATABASE_URL) {
//   throw new Error("DATABASE_URL manquante dans les variables d'environnement");
// }

// const sql = neon(process.env.DATABASE_URL);

// export const db = drizzle(sql, { schema });

// export type DB = typeof db;