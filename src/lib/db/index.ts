import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import * as schema from "./schema"
import { env } from "@/lib/env"

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl:
    env.NODE_ENV === "production"
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