import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "../src/lib/db/index";
import { resolve } from "path";

async function main() {
  console.log("Running migrations...");
  try {
    await migrate(db, { migrationsFolder: resolve(__dirname, "migrations") });
    console.log("Migrations applied successfully!");
  } catch (err) {
    console.error("Error applying migrations", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
main();
