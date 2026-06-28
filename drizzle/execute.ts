import { pool } from "../src/lib/db/index";
import { readFileSync } from "fs";
import { resolve } from "path";

async function main() {
  console.log("Running SQL...");
  try {
    const sql = readFileSync(resolve(__dirname, "migrations/0002_conscious_odin.sql"), "utf8");
    // We split by statement-breakpoint because postgres driver can run multiple statements, 
    // but sometimes enums and table alters behave better when run separately or all together.
    // drizzle separates them with --> statement-breakpoint
    const statements = sql.split("--> statement-breakpoint").map(s => s.trim()).filter(s => s.length > 0);
    
    for (const stmt of statements) {
        console.log("Executing:", stmt.substring(0, 50) + "...");
        await pool.query(stmt);
    }
    console.log("SQL applied successfully!");
  } catch (err) {
    console.error("Error applying SQL", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
main();
