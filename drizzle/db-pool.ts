import { env } from "@/lib/env";
import { Pool } from "pg";

export const migrationPool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
