import { spawnSync } from "node:child_process";

const confirmation = process.argv.includes("--confirmed-development-test");
const databaseUrl = process.env.DATABASE_URL;

if (!confirmation) {
  throw new Error(
    "Ajoutez --confirmed-development-test pour confirmer la base de développement/test.",
  );
}
if (!databaseUrl) {
  throw new Error("DATABASE_URL est absente de .env.local.");
}
if (
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL_ENV === "production"
) {
  throw new Error("Les tests Phase 1 refusent un environnement de production.");
}

const parsed = new URL(databaseUrl);
if (!parsed.hostname.endsWith(".neon.tech")) {
  throw new Error(
    "La base Phase 1 doit être la Neon de développement/test explicitement désignée.",
  );
}

// Les transactions interactives passent par node-postgres. L'endpoint direct
// de la même base est plus stable que le pooler gratuit pour ces suites longues.
const directDatabaseUrl = new URL(databaseUrl);
directDatabaseUrl.hostname = directDatabaseUrl.hostname.replace("-pooler", "");
const phase1DatabaseUrl = process.argv.includes("--use-direct")
  ? directDatabaseUrl.toString()
  : databaseUrl;

const suiteFiles = {
  characterization: "tests/phase1-db-characterization.test.ts",
  a15: "tests/a15-db-invariants.test.ts",
  subscriptions: "tests/subscription-db-concurrency.test.ts",
  transactions: "tests/transactions-db.test.ts",
  paystack: "tests/paystack-db.test.ts",
  "service-markets": "tests/service-markets-db.test.ts",
  deliveries: "tests/delivery-driver-db.test.ts",
};
const requestedSuite = process.argv
  .find((argument) => argument.startsWith("--suite="))
  ?.slice("--suite=".length);
if (requestedSuite && !(requestedSuite in suiteFiles)) {
  throw new Error(`Suite Phase 1 inconnue : ${requestedSuite}`);
}
const suites = requestedSuite
  ? [suiteFiles[requestedSuite]]
  : Object.values(suiteFiles);

console.warn(
  "Phase 1 : exécution séquentielle sur la Neon de développement/test configurée.",
);

const testEnvironment = {
  ...process.env,
  DATABASE_URL: phase1DatabaseUrl,
  TEST_DATABASE_URL: phase1DatabaseUrl,
  DATABASE_URL_TEST: phase1DatabaseUrl,
  ALLOW_DEVELOPMENT_DB_TESTS: "true",
  ALLOW_DEVELOPMENT_TRANSACTION_DB_TESTS: "true",
  ALLOW_DEVELOPMENT_PAYSTACK_DB_TESTS: "true",
  RUN_PHASE1_DB_TESTS: "true",
  RUN_A15_DB_TESTS: "true",
  RUN_SUBSCRIPTION_DB_TESTS: "true",
  RUN_TRANSACTION_DB_TESTS: "true",
  RUN_PAYSTACK_DB_TESTS: "true",
  RUN_SERVICE_MARKETS_DB_TESTS: "true",
  RUN_DELIVERY_DB_TESTS: "true",
  // Évite le transport HTTP Neon instable pendant les scénarios longs ;
  // toutes les lectures et transactions utilisent alors node-postgres.
  E2E_TEST: "true",
};

for (const suite of suites) {
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/vitest/vitest.mjs",
      "run",
      suite,
      "--maxWorkers=1",
      "--no-file-parallelism",
      "--testTimeout=60000",
      "--hookTimeout=90000",
    ],
    { stdio: "inherit", env: testEnvironment },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
