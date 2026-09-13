import { spawnSync } from "node:child_process";

if (!process.argv.includes("--confirmed-development-test")) {
  throw new Error(
    "Ajoutez --confirmed-development-test pour confirmer la base de développement/test.",
  );
}
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL est absente de .env.local.");
if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
  throw new Error("Les tests Phase 6 refusent un environnement de production.");
}
const parsed = new URL(databaseUrl);
if (!parsed.hostname.endsWith(".neon.tech")) {
  throw new Error("La base Phase 6 doit être la Neon de développement/test autorisée.");
}

const result = spawnSync(
  process.execPath,
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "tests/phase6-financial-unification-db.test.ts",
    "--maxWorkers=1",
    "--no-file-parallelism",
    "--testTimeout=60000",
    "--hookTimeout=90000",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      ALLOW_DEVELOPMENT_PHASE6_DB_TESTS: "true",
      RUN_PHASE6_DB_TESTS: "true",
      E2E_TEST: "true",
      DATA_CACHE_ENABLED: "false",
    },
  },
);
if (result.status !== 0) process.exit(result.status ?? 1);
