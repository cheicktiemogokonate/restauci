import { readFileSync } from "fs";
import { resolve } from "path";
import { Pool } from "pg";

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  try {
    const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of envFile.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separator = trimmed.indexOf("=");
      if (separator < 1 || trimmed.slice(0, separator) !== "DATABASE_URL") {
        continue;
      }

      const rawValue = trimmed.slice(separator + 1).trim();
      return rawValue.replace(/^(['"])(.*)\1$/, "$2");
    }
  } catch {
    // The deployment environment is expected to provide DATABASE_URL directly.
  }

  throw new Error("DATABASE_URL manquante pour les migrations");
}

export const migrationPool = new Pool({
  connectionString: getDatabaseUrl(),
});
