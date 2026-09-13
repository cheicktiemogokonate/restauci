import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool, type PoolClient } from "pg";
import { setTimeout as delay } from "node:timers/promises";
import {
  warmApplicationDatabaseConnections,
  warmNeonTestPool,
} from "./support/neon-test-connection";

const enabled = process.env.RUN_PHASE1_DB_TESTS === "true";
const sharedDevelopmentDatabase =
  process.env.ALLOW_DEVELOPMENT_DB_TESTS === "true";
const databaseUrl = sharedDevelopmentDatabase
  ? process.env.DATABASE_URL
  : process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL_TEST;

if (enabled && !databaseUrl) {
  throw new Error("La base de développement/test Phase 1 est introuvable.");
}
if (enabled && !sharedDevelopmentDatabase) {
  throw new Error(
    "RUN_PHASE1_DB_TESTS exige ALLOW_DEVELOPMENT_DB_TESTS=true pour la Neon désignée.",
  );
}

const describeDatabase = enabled ? describe.sequential : describe.skip;

describeDatabase("Phase 1 — caractérisation comptes et Résidences", () => {
  const runId = crypto.randomUUID();
  const fixturePrefix = `phase1.characterization.${runId}`;
  const ids = {
    admin: crypto.randomUUID(),
    restaurantUser: crypto.randomUUID(),
    residenceAUser: crypto.randomUUID(),
    residenceBUser: crypto.randomUUID(),
    unassignedUser: crypto.randomUUID(),
    restaurantAccount: crypto.randomUUID(),
    residenceAAccount: crypto.randomUUID(),
    residenceBAccount: crypto.randomUUID(),
    restaurant: crypto.randomUUID(),
  };
  let pool: Pool;
  const residenceId = crypto.randomUUID();
  let partnerService: typeof import("@/modules/partners/server");
  let residenceService: typeof import("@/modules/residences/server");

  function email(role: string) {
    return `${fixturePrefix}.${role}@test.invalid`;
  }

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
        const transient = /ECONNRESET|fetch failed|connection timeout|socket disconnected/i.test(
          serialized,
        );
        if (!transient || attempt === 4) throw error;
        await delay(attempt * 250);
      }
    }
    throw new Error("Tentatives DB Phase 1 épuisées.");
  }

  async function cleanup(client: PoolClient) {
    const accounts = [
      ids.restaurantAccount,
      ids.residenceAAccount,
      ids.residenceBAccount,
    ];
    await client.query(
      `DELETE FROM residence_images
       WHERE residence_id IN (
         SELECT id FROM residences WHERE partner_account_id = ANY($1::uuid[])
       )`,
      [accounts],
    );
    await client.query(
      "DELETE FROM residences WHERE partner_account_id = ANY($1::uuid[])",
      [accounts],
    );
    await client.query(
      "DELETE FROM restaurants WHERE partner_account_id = ANY($1::uuid[])",
      [accounts],
    );
    await client.query(
      `DELETE FROM partner_accounts
       WHERE id = ANY($1::uuid[]) OR user_id = $2`,
      [accounts, ids.unassignedUser],
    );
    await client.query(
      "DELETE FROM users WHERE id = ANY($1::varchar[])",
      [[
        ids.admin,
        ids.restaurantUser,
        ids.residenceAUser,
        ids.residenceBUser,
        ids.unassignedUser,
      ]],
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
    residenceService = await import("@/modules/residences/server");
    await warmApplicationDatabaseConnections();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await cleanup(client);
      await client.query(
        `INSERT INTO users (
          id, email, password, role, nom, telephone, created_at, updated_at
        ) VALUES
          ($1, $6, 'phase1-test-only', 'admin', $11, '+2250100000001', NOW(), NOW()),
          ($2, $7, 'phase1-test-only', 'partner', $12, '+2250100000002', NOW(), NOW()),
          ($3, $8, 'phase1-test-only', 'partner', $13, '+2250100000003', NOW(), NOW()),
          ($4, $9, 'phase1-test-only', 'partner', $14, '+2250100000004', NOW(), NOW()),
          ($5, $10, 'phase1-test-only', 'partner', $15, '+2250100000005', NOW(), NOW())`,
        [
          ids.admin,
          ids.restaurantUser,
          ids.residenceAUser,
          ids.residenceBUser,
          ids.unassignedUser,
          email("admin"),
          email("restaurant"),
          email("residence-a"),
          email("residence-b"),
          email("unassigned"),
          `[phase1:characterization] admin ${runId}`,
          `[phase1:characterization] restaurant ${runId}`,
          `[phase1:characterization] residence A ${runId}`,
          `[phase1:characterization] residence B ${runId}`,
          `[phase1:characterization] unassigned ${runId}`,
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
          ids.residenceAAccount,
          ids.residenceAUser,
          ids.residenceBAccount,
          ids.residenceBUser,
        ],
      );
      await client.query(
        `INSERT INTO restaurants (
          id, partner_account_id, nom, slug, telephone, adresse,
          latitude, longitude, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, '+2250100000010', 'Fixture Phase 1',
          5.35, -4.01, NOW(), NOW())`,
        [
          ids.restaurant,
          ids.restaurantAccount,
          `[phase1:characterization] restaurant ${runId}`,
          `phase1-characterization-${runId}`,
        ],
      );
      await client.query(
        `INSERT INTO residences (
          id, partner_account_id, title, slug, description,
          price_per_night_fcfa, max_guests, address, city, country,
          publication_intent, actif, suspendu, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, 25000, 2, 'Adresse fixture Phase 1',
          'Abidjan', 'Côte d’Ivoire', false, false, false, NOW(), NOW()
        )`,
        [
          residenceId,
          ids.residenceAAccount,
          `[phase1:characterization] Résidence ${runId}`,
          `phase1-characterization-residence-${runId}`,
          "Fixture de caractérisation Phase 1, identifiable et supprimée après le scénario.",
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
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await cleanup(client);
      await client.query("COMMIT");
      const remaining = await client.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM users
         WHERE email LIKE $1`,
        ["phase1.characterization.%@test.invalid"],
      );
      expect(remaining.rows[0]?.count).toBe(0);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  }, 90_000);

  it("rend le choix d'activité idempotent mais immuable", async () => {
    const created = await withTransientDatabaseRetry(() =>
      partnerService.choosePartnerActivity(ids.unassignedUser, "residence"),
    );
    expect(created.activityType).toBe("residence");
    await expect(
      withTransientDatabaseRetry(() =>
        partnerService.choosePartnerActivity(ids.unassignedUser, "restaurant"),
      ),
    ).rejects.toMatchObject({ code: "ACTIVITY_ALREADY_SELECTED" });
  });

  it("refuse la création Résidence depuis un compte Restaurant", async () => {
    await expect(
      withTransientDatabaseRetry(() =>
        residenceService.createResidence(ids.restaurantAccount, {
          title: "Résidence interdite Phase 1",
          description:
            "Cette création doit être refusée avant toute écriture dans la base de test.",
          pricePerNightFcfa: 25_000,
          maxGuests: 2,
          address: "Adresse fixture Phase 1",
          city: "Abidjan",
          country: "Côte d’Ivoire",
          latitude: null,
          longitude: null,
          publicationIntent: false,
          photos: [],
        }),
      ),
    ).rejects.toMatchObject({ code: "RESIDENCE_ACTIVITY_REQUIRED" });
  });

  it("masque une Résidence à un autre compte Résidence", async () => {
    await expect(
      withTransientDatabaseRetry(() =>
        residenceService.getPartnerResidence(ids.residenceBAccount, residenceId),
      ),
    ).resolves.toBeNull();
    await expect(
      withTransientDatabaseRetry(() =>
        residenceService.getPartnerResidence(ids.residenceAAccount, residenceId),
      ),
    ).resolves.toMatchObject({ id: residenceId });
  });

  it("caractérise les unicités compte/utilisateur et Restaurant/compte", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await expect(
        client.query(
          `INSERT INTO partner_accounts (
            id, user_id, activity_type, created_at, updated_at
          ) VALUES ($1, $2, 'restaurant', NOW(), NOW())`,
          [crypto.randomUUID(), ids.restaurantUser],
        ),
      ).rejects.toMatchObject({ code: "23505" });
      await client.query("ROLLBACK");
      await client.query("BEGIN");
      await expect(
        client.query(
          `INSERT INTO restaurants (
            id, partner_account_id, nom, slug, telephone, adresse,
            latitude, longitude, created_at, updated_at
          ) VALUES ($1, $2, 'Doublon Phase 1', $3, '+2250100000011',
            'Fixture Phase 1', 5.35, -4.01, NOW(), NOW())`,
          [
            crypto.randomUUID(),
            ids.restaurantAccount,
            `phase1-duplicate-${runId}`,
          ],
        ),
      ).rejects.toMatchObject({ code: "23505" });
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  });

  it("compte seulement les Résidences candidates à la visibilité dans le quota", async () => {
    const { selectResidenceQuotaEligibleResources } = await import(
      "@/modules/quotas/model"
    );
    const now = new Date();
    const result = selectResidenceQuotaEligibleResources(
      [
        {
          id: residenceId,
          publicationIntent: true,
          createdAt: now,
          firstPublishedAt: now,
        },
        {
          id: crypto.randomUUID(),
          publicationIntent: false,
          createdAt: now,
          firstPublishedAt: null,
        },
      ],
      1,
    );
    expect(result.candidateCount).toBe(1);
    expect(result.residenceIds.has(residenceId)).toBe(true);
  });
});
