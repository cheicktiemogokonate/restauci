import { migrate } from "drizzle-orm/node-postgres/migrator";
// import { db, pool } from "../src/lib/db/index";

import { drizzle } from "drizzle-orm/node-postgres";
import { resolve } from "path";
import { migrationPool } from "./db-pool";

const db = drizzle(migrationPool);

async function main() {
  console.log("Running migrations...");
  try {
    await migrate(db, { migrationsFolder: resolve(__dirname, "migrations") });
    console.log("Migrations applied successfully!");
  } catch (err) {
    console.error("Error applying migrations", err);
    process.exit(1);
  } finally {
    await migrationPool.end();
  }
}
main();
