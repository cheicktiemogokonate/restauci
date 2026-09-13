import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool, type PoolClient } from "pg";
import { setTimeout as delay } from "node:timers/promises";
import {
  warmApplicationDatabaseConnections,
  warmNeonTestPool,
} from "./support/neon-test-connection";

const enabled = process.env.RUN_PHASE4_DB_TESTS === "true";
const sharedDevelopmentDatabase =
  process.env.ALLOW_DEVELOPMENT_DB_TESTS === "true";
const databaseUrl = sharedDevelopmentDatabase
  ? process.env.DATABASE_URL
  : process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL_TEST;

if (enabled && !databaseUrl) {
  throw new Error("La base de développement/test Phase 4 est introuvable.");
}
if (enabled && !sharedDevelopmentDatabase) {
  throw new Error(
    "RUN_PHASE4_DB_TESTS exige ALLOW_DEVELOPMENT_DB_TESTS=true pour la Neon désignée.",
  );
}

const describeDatabase = enabled ? describe.sequential : describe.skip;

describeDatabase("Phase 4 — Partner Accounts mono-activité", () => {
  const runId = crypto.randomUUID();
  const prefix = `phase4.${runId}`;
  const ids = {
    admin: crypto.randomUUID(),
    restaurantUser: crypto.randomUUID(),
    residenceUser: crypto.randomUUID(),
    residenceOtherUser: crypto.randomUUID(),
    pendingUser: crypto.randomUUID(),
    restaurantAccount: crypto.randomUUID(),
    residenceAccount: crypto.randomUUID(),
    residenceOtherAccount: crypto.randomUUID(),
    restaurant: crypto.randomUUID(),
    residence: crypto.randomUUID(),
  };
  let pool: Pool;
  let partnerService: typeof import("@/modules/partners/server");
  let restaurantService: typeof import("@/modules/restaurants/server");
  let residenceService: typeof import("@/modules/residences/server");

  async function withTransientDatabaseRetry<T>(operation: () => Promise<T>) {
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        const serialized = String(
          error instanceof Error
            ? `${error.message} ${(error as Error & { cause?: unknown }).cause ?? ""}`
            : error,
        );
        if (
          !/ECONNRESET|fetch failed|connection timeout|socket disconnected/i.test(
            serialized,
          ) ||
          attempt === 4
        ) {
          throw error;
        }
        await delay(attempt * 250);
      }
    }
    throw new Error("Tentatives DB Phase 4 épuisées.");
  }

  async function cleanup(client: PoolClient) {
    await client.query(
      `DELETE FROM residence_images
       WHERE residence_id IN (
         SELECT residence.id
         FROM residences AS residence
         JOIN partner_accounts AS account
           ON account.id = residence.partner_account_id
         JOIN users AS owner ON owner.id = account.user_id
         WHERE owner.email LIKE 'phase4.%@test.invalid'
       )`,
    );
    await client.query(
      `DELETE FROM residences
       WHERE partner_account_id IN (
         SELECT account.id
         FROM partner_accounts AS account
         JOIN users AS owner ON owner.id = account.user_id
         WHERE owner.email LIKE 'phase4.%@test.invalid'
       )`,
    );
    await client.query(
      `DELETE FROM restaurants
       WHERE partner_account_id IN (
         SELECT account.id
         FROM partner_accounts AS account
         JOIN users AS owner ON owner.id = account.user_id
         WHERE owner.email LIKE 'phase4.%@test.invalid'
       )`,
    );
    await client.query(
      `DELETE FROM partner_accounts
       WHERE user_id IN (
         SELECT id FROM users WHERE email LIKE 'phase4.%@test.invalid'
       )`,
    );
    await client.query(
      "DELETE FROM users WHERE email LIKE 'phase4.%@test.invalid'",
    );
  }

  beforeAll(async () => {
    pool = new Pool({
      connectionString: databaseUrl,
      max: 2,
      connectionTimeoutMillis: 30_000,
      idleTimeoutMillis: 60_000,
      keepAlive: true,
    });
    await warmNeonTestPool(pool);
    partnerService = await import("@/modules/partners/server");
    restaurantService = await import("@/modules/restaurants/server");
    residenceService = await import("@/modules/residences/server");
    await warmApplicationDatabaseConnections();

    const client = await withTransientDatabaseRetry(() => pool.connect());
    try {
      await client.query("BEGIN");
      await cleanup(client);
      await client.query(
        `INSERT INTO users (
          id, email, password, role, nom, telephone, created_at, updated_at
        ) VALUES
          ($1, $6, 'phase4-test-only', 'admin', $11, '+2250100000001', NOW(), NOW()),
          ($2, $7, 'phase4-test-only', 'partner', $12, '+2250100000002', NOW(), NOW()),
          ($3, $8, 'phase4-test-only', 'partner', $13, '+2250100000003', NOW(), NOW()),
          ($4, $9, 'phase4-test-only', 'partner', $14, '+2250100000004', NOW(), NOW()),
          ($5, $10, 'phase4-test-only', 'partner', $15, '+2250100000005', NOW(), NOW())`,
        [
          ids.admin,
          ids.restaurantUser,
          ids.residenceUser,
          ids.residenceOtherUser,
          ids.pendingUser,
          `${prefix}.admin@test.invalid`,
          `${prefix}.restaurant@test.invalid`,
          `${prefix}.residence@test.invalid`,
          `${prefix}.residence-other@test.invalid`,
          `${prefix}.pending@test.invalid`,
          `[phase4] Admin ${runId}`,
          `[phase4] Restaurant ${runId}`,
          `[phase4] Résidence ${runId}`,
          `[phase4] Autre résidence ${runId}`,
          `[phase4] Activité en attente ${runId}`,
        ],
      );
      await client.query(
        `INSERT INTO partner_accounts (
          id, user_id, activity_type, created_at, updated_at
        ) VALUES
          ($1, $2, 'restaurant', NOW(), NOW()),
          ($3, $4, 'residence', NOW(), NOW()),
          ($5, $6, 'residence', NOW(), NOW())`,
        [
          ids.restaurantAccount,
          ids.restaurantUser,
          ids.residenceAccount,
          ids.residenceUser,
          ids.residenceOtherAccount,
          ids.residenceOtherUser,
        ],
      );
      await client.query(
        `INSERT INTO restaurants (
          id, partner_account_id, nom, slug, telephone, adresse,
          latitude, longitude, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, '+2250100000010', 'Fixture Phase 4',
          5.35, -4.01, NOW(), NOW())`,
        [
          ids.restaurant,
          ids.restaurantAccount,
          `[phase4] Restaurant ${runId}`,
          `phase4-restaurant-${runId}`,
        ],
      );
      await client.query(
        `INSERT INTO residences (
          id, partner_account_id, title, slug, description,
          price_per_night_fcfa, max_guests, address, city, country,
          publication_intent, actif, suspendu, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'Fixture Phase 4', 25000, 2,
          'Fixture Phase 4', 'Abidjan', 'Côte d’Ivoire', false, false, false,
          NOW(), NOW())`,
        [
          ids.residence,
          ids.residenceAccount,
          `[phase4] Résidence ${runId}`,
          `phase4-residence-${runId}`,
        ],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }, 90_000);

  afterAll(async () => {
    if (!pool) return;
    const client = await withTransientDatabaseRetry(() => pool.connect());
    try {
      await client.query("BEGIN");
      await cleanup(client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  }, 90_000);

  it("projette les partenaires sans confondre activité et entité", async () => {
    const page = await withTransientDatabaseRetry(() =>
      partnerService.listAdminPartnerOwners({
        search: prefix,
        page: 1,
        limit: 20,
      }),
    );
    expect(page.total).toBe(4);
    expect(page.items.find((item) => item.userId === ids.pendingUser)).toMatchObject({
      partnerAccount: null,
    });
    expect(
      page.items.find((item) => item.userId === ids.restaurantUser),
    ).toMatchObject({
      partnerAccount: { activityType: "restaurant" },
    });
    expect(
      page.items.find((item) => item.userId === ids.residenceUser),
    ).toMatchObject({
      partnerAccount: { activityType: "residence" },
    });
  });

  it("projette séparément le Restaurant et la collection de Résidences", async () => {
    await expect(
      withTransientDatabaseRetry(() =>
        restaurantService.getAdminRestaurantAccountSummary(
          ids.restaurantAccount,
        ),
      ),
    ).resolves.toMatchObject({ id: ids.restaurant, name: expect.any(String) });
    await expect(
      withTransientDatabaseRetry(() =>
        residenceService.getAdminResidenceAccountSummary(ids.residenceAccount),
      ),
    ).resolves.toMatchObject({
      residences: [{ id: ids.residence, moderationStatus: "draft" }],
      visibleCount: 0,
      quota: { planCode: "decouverte" },
    });
  });

  it("isole les Résidences entre deux comptes du même vertical", async () => {
    await expect(
      withTransientDatabaseRetry(() =>
        residenceService.getPartnerResidence(
          ids.residenceOtherAccount,
          ids.residence,
        ),
      ),
    ).resolves.toBeNull();
  });

  it("rend l'activité immuable en base", async () => {
    await expect(
      pool.query(
        "UPDATE partner_accounts SET activity_type = 'residence' WHERE id = $1",
        [ids.restaurantAccount],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("interdit un Partner Account d'administrateur et un changement de rôle invalide", async () => {
    await expect(
      pool.query(
        "INSERT INTO partner_accounts (id, user_id, activity_type) VALUES ($1, $2, 'restaurant')",
        [crypto.randomUUID(), ids.admin],
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [
        ids.restaurantUser,
      ]),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("interdit les entités croisées et un second Restaurant avant partage", async () => {
    await expect(
      pool.query(
        `INSERT INTO residences (
          id, partner_account_id, title, slug, description,
          price_per_night_fcfa, max_guests, address, city, country
        ) VALUES ($1, $2, 'Croisement interdit', $3, 'Fixture Phase 4',
          25000, 2, 'Fixture Phase 4', 'Abidjan', 'Côte d’Ivoire')`,
        [
          crypto.randomUUID(),
          ids.restaurantAccount,
          `phase4-cross-residence-${runId}`,
        ],
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      pool.query(
        `INSERT INTO restaurants (
          id, partner_account_id, nom, slug, telephone, adresse,
          latitude, longitude, created_at, updated_at
        ) VALUES ($1, $2, 'Croisement interdit', $3, '+2250100000011',
          'Fixture Phase 4', 5.35, -4.01, NOW(), NOW())`,
        [
          crypto.randomUUID(),
          ids.residenceAccount,
          `phase4-cross-restaurant-${runId}`,
        ],
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      pool.query(
        `INSERT INTO restaurants (
          id, partner_account_id, nom, slug, telephone, adresse,
          latitude, longitude, created_at, updated_at
        ) VALUES ($1, $2, 'Second Restaurant', $3, '+2250100000012',
          'Fixture Phase 4', 5.35, -4.01, NOW(), NOW())`,
        [
          crypto.randomUUID(),
          ids.restaurantAccount,
          `phase4-second-restaurant-${runId}`,
        ],
      ),
    ).rejects.toMatchObject({ code: "23505" });
  });
});
