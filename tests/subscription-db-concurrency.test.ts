import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { readFileSync } from "node:fs";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL_TEST;
const runDatabaseTests = process.env.RUN_SUBSCRIPTION_DB_TESTS === "true";
if (runDatabaseTests && !databaseUrl) {
  throw new Error("TEST_DATABASE_URL est obligatoire pour les tests DB");
}
let developmentUrl: string | undefined;
try {
  developmentUrl = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .map((line) => line.match(/^DATABASE_URL=(.*)$/)?.[1]?.replace(/^['"]|['"]$/g, ""))
    .find(Boolean);
} catch {
  developmentUrl = process.env.TEST_DATABASE ? undefined : process.env.DATABASE_URL;
}
if (runDatabaseTests && databaseUrl === developmentUrl) {
  throw new Error("La base de test doit être distincte de DATABASE_URL");
}
const describeDatabase = runDatabaseTests ? describe : describe.skip;

describeDatabase("subscription database concurrency invariants", () => {
  const pool = new Pool({ connectionString: databaseUrl, max: 4 });
  const suffix = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const partnerAccountId = crypto.randomUUID();
  const restaurantId = crypto.randomUUID();

  beforeAll(async () => {
    await pool.query(
      `INSERT INTO users (id, nom, email, password, telephone, role, created_at, updated_at)
       VALUES ($1, 'Test concurrence', $2, 'not-a-real-password', '+2250000000000', 'partner', NOW(), NOW())`,
      [userId, `subscription-concurrency-${suffix}@example.test`],
    );
    await pool.query(
      `INSERT INTO partner_accounts (id, user_id, activity_type, created_at, updated_at)
       VALUES ($1, $2, 'restaurant', NOW(), NOW())`,
      [partnerAccountId, userId],
    );
    await pool.query(
      `INSERT INTO restaurants (
         id, partner_account_id, nom, slug, telephone, adresse, latitude, longitude,
         created_at, updated_at
       ) VALUES ($1, $2, 'Restaurant concurrence', $3, '+2250000000000', 'Test', 0, 0, NOW(), NOW())`,
      [restaurantId, partnerAccountId, `subscription-concurrency-${suffix}`],
    );
  }, 60_000);

  afterAll(async () => {
    await pool.query("DELETE FROM subscription_periods WHERE partner_account_id = $1", [partnerAccountId]);
    await pool.query("DELETE FROM subscription_requests WHERE partner_account_id = $1", [partnerAccountId]);
    await pool.query("DELETE FROM restaurants WHERE id = $1", [restaurantId]);
    await pool.query("DELETE FROM partner_accounts WHERE id = $1", [partnerAccountId]);
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    await pool.end();
  }, 60_000);

  it("allows only one pending request under concurrent inserts", async () => {
    const insert = () => pool.query(
      `INSERT INTO subscription_requests (id, partner_account_id, plan_code, prix_fige_fcfa, created_at)
       VALUES ($1, $2, 'croissance', 25000, NOW())`,
      [crypto.randomUUID(), partnerAccountId],
    );
    const results = await Promise.allSettled([insert(), insert()]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  }, 90_000);

  it("allows only one active paid period under concurrent inserts", async () => {
    const startAt = new Date();
    const endAt = new Date(startAt);
    endAt.setFullYear(endAt.getFullYear() + 1);
    const insert = (planCode: "croissance" | "partenaire_fier") => pool.query(
      `INSERT INTO subscription_periods (
         id, partner_account_id, plan_code, taux_commission_bps_fige,
         prix_paye_fcfa, date_debut, date_echeance, statut, created_at
       ) VALUES ($1, $2, $3, 1000, 25000, $4, $5, 'active', NOW())`,
      [crypto.randomUUID(), partnerAccountId, planCode, startAt, endAt],
    );
    const results = await Promise.allSettled([
      insert("croissance"),
      insert("partenaire_fier"),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  }, 90_000);
});
