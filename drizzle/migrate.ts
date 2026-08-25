import { migrate } from "drizzle-orm/node-postgres/migrator";
// import { db, pool } from "../src/lib/db/index";

import { drizzle } from "drizzle-orm/node-postgres";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { migrationPool } from "./db-pool.ts";

const migrationsDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "migrations",
);

const db = drizzle(migrationPool);

async function main() {
  console.log("Running migrations...");
  try {
    await migrate(db, { migrationsFolder: migrationsDirectory });
    console.log("Migrations applied successfully!");
  } catch (err) {
    console.error("Error applying migrations", err);
    process.exit(1);
  } finally {
    await migrationPool.end();
  }
}
main();
