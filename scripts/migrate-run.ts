import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { db } from "../src/lib/db";
import fs from "fs";
import path from "path";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const migrations = ["0003_wealthy_nomad.sql", "0004_burly_wendigo.sql"];
    for (const migration of migrations) {
      const migrationPath = path.join(__dirname, "../drizzle/migrations", migration);
      const migrationSql = fs.readFileSync(migrationPath, "utf-8");
      console.log(`Running migration ${migration} manually...`);
      const statements = migrationSql.split("--> statement-breakpoint");
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await db.execute(sql.raw(statement.trim()));
          } catch (e: any) {
            // Ignore if relation already exists or type already exists (in case it partially ran)
            if (e.code === '42P07' || e.code === '42710' || e.code === '42701') {
              console.log(`Ignored duplicate creation in ${migration}:`, e.message);
            } else {
              throw e;
            }
          }
        }
      }
      console.log(`Migration ${migration} applied successfully.`);
    }
  } catch (err) {
    console.error("Migration failed:", err);
  }
  process.exit(0);
}

main();
