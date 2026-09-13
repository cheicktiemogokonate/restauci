import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool, type PoolClient } from "pg";
import { setTimeout as delay } from "node:timers/promises";
import {
  warmApplicationDatabaseConnections,
  warmNeonTestPool,
} from "./support/neon-test-connection";

const enabled = process.env.RUN_PHASE5_DB_TESTS === "true";
const sharedDevelopmentDatabase =
  process.env.ALLOW_DEVELOPMENT_DB_TESTS === "true";
const databaseUrl = sharedDevelopmentDatabase
  ? process.env.DATABASE_URL
  : process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL_TEST;

if (enabled && !databaseUrl) {
  throw new Error("La base de développement/test Phase 5 est introuvable.");
}
if (enabled && !sharedDevelopmentDatabase) {
  throw new Error(
    "RUN_PHASE5_DB_TESTS exige ALLOW_DEVELOPMENT_DB_TESTS=true pour la Neon désignée.",
  );
}

const describeDatabase = enabled ? describe.sequential : describe.skip;

describeDatabase("Phase 5 — Identity et Media", () => {
  const runId = crypto.randomUUID();
  const prefix = `phase5.${runId}`;
  const ids = {
    admin: crypto.randomUUID(),
    owner: crypto.randomUUID(),
    account: crypto.randomUUID(),
    restaurant: crypto.randomUUID(),
    verification: crypto.randomUUID(),
    document: crypto.randomUUID(),
    asset: crypto.randomUUID(),
    rejectedOwner: crypto.randomUUID(),
    rejectedAccount: crypto.randomUUID(),
    rejectedVerification: crypto.randomUUID(),
    rejectedDocument: crypto.randomUUID(),
  };
  let pool: Pool;
  let identityService: typeof import("@/modules/identity/server");
  let mediaService: typeof import("@/modules/media/server");
  let eventService: typeof import("@/modules/events/server");
  let restaurantService: typeof import("@/modules/restaurants/server");
  let transactionalDb: typeof import("@/infrastructure/db").transactionalDb;

  async function withRetry<T>(operation: () => Promise<T>) {
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        if (
          !/ECONNRESET|fetch failed|connection timeout|socket disconnected/i.test(
            String(error),
          ) ||
          attempt === 4
        ) {
          throw error;
        }
        await delay(attempt * 250);
      }
    }
    throw new Error("Tentatives DB Phase 5 épuisées.");
  }

  async function cleanup(client: PoolClient) {
    await client.query(
      `DELETE FROM audit_log WHERE event_id IN (
        SELECT id FROM business_events WHERE target_id IN ($1, $2)
      )`,
      [ids.verification, ids.rejectedVerification],
    );
    await client.query(
      `DELETE FROM event_effect_receipts WHERE event_id IN (
        SELECT id FROM business_events WHERE target_id IN ($1, $2)
      )`,
      [ids.verification, ids.rejectedVerification],
    );
    await client.query(
      `DELETE FROM outbox_messages WHERE event_id IN (
        SELECT id FROM business_events WHERE target_id IN ($1, $2)
      )`,
      [ids.verification, ids.rejectedVerification],
    );
    await client.query("DELETE FROM notifications WHERE user_id IN ($1, $2)", [ids.owner, ids.rejectedOwner]);
    await client.query("DELETE FROM business_events WHERE target_id IN ($1, $2)", [ids.verification, ids.rejectedVerification]);
    await client.query("DELETE FROM public_media_assets WHERE owner_user_id = $1", [ids.owner]);
    await client.query("DELETE FROM partner_identity_documents WHERE verification_id IN ($1, $2)", [ids.verification, ids.rejectedVerification]);
    await client.query("DELETE FROM partner_identity_verifications WHERE id IN ($1, $2)", [ids.verification, ids.rejectedVerification]);
    await client.query("DELETE FROM restaurants WHERE id = $1", [ids.restaurant]);
    await client.query("DELETE FROM partner_accounts WHERE id IN ($1, $2)", [ids.account, ids.rejectedAccount]);
    await client.query("DELETE FROM users WHERE id IN ($1, $2, $3)", [ids.admin, ids.owner, ids.rejectedOwner]);
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
    identityService = await import("@/modules/identity/server");
    mediaService = await import("@/modules/media/server");
    eventService = await import("@/modules/events/server");
    restaurantService = await import("@/modules/restaurants/server");
    transactionalDb = (await import("@/infrastructure/db")).transactionalDb;
    await warmApplicationDatabaseConnections();

    const client = await withRetry(() => pool.connect());
    try {
      await client.query("BEGIN");
      await cleanup(client);
      await client.query(
        `INSERT INTO users (id, email, password, role, nom, telephone, created_at, updated_at)
         VALUES ($1, $3, 'phase5-test-only', 'admin', 'Admin Phase 5', '+2250100000051', NOW(), NOW()),
                ($2, $4, 'phase5-test-only', 'partner', 'Partner Phase 5', '+2250100000052', NOW(), NOW())`,
        [ids.admin, ids.owner, `${prefix}.admin@test.invalid`, `${prefix}.owner@test.invalid`],
      );
      await client.query(
        `INSERT INTO users (id, email, password, role, nom, telephone, created_at, updated_at)
         VALUES ($1, $2, 'phase5-test-only', 'partner', 'Partner rejeté Phase 5',
           '+2250100000054', NOW(), NOW())`,
        [ids.rejectedOwner, `${prefix}.rejected@test.invalid`],
      );
      await client.query(
        `INSERT INTO partner_accounts (id, user_id, activity_type, created_at, updated_at)
         VALUES ($1, $2, 'restaurant', NOW(), NOW())`,
        [ids.account, ids.owner],
      );
      await client.query(
        `INSERT INTO partner_accounts (id, user_id, activity_type, created_at, updated_at)
         VALUES ($1, $2, 'residence', NOW(), NOW())`,
        [ids.rejectedAccount, ids.rejectedOwner],
      );
      await client.query(
        `INSERT INTO restaurants (
          id, partner_account_id, nom, slug, telephone, adresse, latitude,
          longitude, actif, suspendu, en_ligne, accepte_commandes, created_at, updated_at
        ) VALUES ($1, $2, 'Restaurant Phase 5', $3, '+2250100000053',
          'Adresse Phase 5', 5.35, -4.01, true, false, true, true, NOW(), NOW())`,
        [ids.restaurant, ids.account, `phase5-${runId}`],
      );
      await client.query(
        `INSERT INTO partner_identity_verifications (
          id, partner_account_id, status, legal_name, document_type,
          document_country_code, document_expires_on, submitted_at, created_at, updated_at
        ) VALUES ($1, $2, 'pending', 'Partner rejeté Phase 5', 'passport', 'CI',
          '2035-01-01', NOW(), NOW(), NOW())`,
        [ids.rejectedVerification, ids.rejectedAccount],
      );
      await client.query(
        `INSERT INTO partner_identity_verifications (
          id, partner_account_id, status, legal_name, document_type,
          document_country_code, document_expires_on, submitted_at, created_at, updated_at
        ) VALUES ($1, $2, 'pending', 'Partner Phase 5', 'passport', 'CI',
          '2035-01-01', NOW(), NOW(), NOW())`,
        [ids.verification, ids.account],
      );
      await client.query(
        `INSERT INTO partner_identity_documents (
          id, verification_id, side, storage_key, content_type, size_bytes,
          sha256, scan_status, clean_storage_key, clean_content_type,
          clean_size_bytes, clean_sha256, scan_attempts, scan_completed_at, uploaded_at
        ) VALUES ($1, $2, 'front', $3, 'image/jpeg', 128, $4, 'clean', $5,
          'image/jpeg', 128, $4, 1, NOW(), NOW())`,
        [
          ids.rejectedDocument,
          ids.rejectedVerification,
          `identity/quarantine/${runId}-rejected.jpg`,
          "c".repeat(64),
          `identity/clean/${runId}-rejected.jpg`,
        ],
      );
      await client.query(
        `INSERT INTO partner_identity_documents (
          id, verification_id, side, storage_key, content_type, size_bytes,
          sha256, scan_status, clean_storage_key, clean_content_type,
          clean_size_bytes, clean_sha256, scan_attempts, scan_completed_at, uploaded_at
        ) VALUES ($1, $2, 'front', $3, 'image/jpeg', 128, $4, 'clean', $5,
          'image/jpeg', 128, $4, 1, NOW(), NOW())`,
        [
          ids.document,
          ids.verification,
          `identity/quarantine/${runId}.jpg`,
          "a".repeat(64),
          `identity/clean/${runId}.jpg`,
        ],
      );
      await client.query(
        `INSERT INTO public_media_assets (
          id, owner_user_id, storage_key, public_url, content_type, size_bytes,
          sha256, status, expires_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'image/jpeg', 128, $5, 'temporary',
          NOW() + INTERVAL '24 hours', NOW(), NOW())`,
        [
          ids.asset,
          ids.owner,
          `restaurants/${ids.owner}/2026/09/${ids.asset}.jpg`,
          `https://media.test/restaurants/${ids.owner}/2026/09/${ids.asset}.jpg`,
          "b".repeat(64),
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
    const client = await withRetry(() => pool.connect());
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

  it("blocks Restaurant visibility until the KYC decision, then projects it immediately", async () => {
    await expect(
      withRetry(() => restaurantService.getPublicRestaurantBySlug(`phase5-${runId}`)),
    ).resolves.toBeNull();

    const result = await withRetry(() =>
      identityService.verifyPartnerIdentity(ids.admin, {
        verificationId: ids.verification,
      }),
    );
    expect(result).toMatchObject({ status: "verified", activityType: "restaurant" });

    await expect(
      withRetry(() => restaurantService.getPublicRestaurantBySlug(`phase5-${runId}`)),
    ).resolves.toMatchObject({ id: ids.restaurant });

    await withRetry(() => eventService.processCausalityOutbox({ limit: 100 }));
    const client = await withRetry(() => pool.connect());
    try {
      const proof = await client.query(
        `SELECT
          (SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND lien_id = $2)::int AS notifications,
          (SELECT COUNT(*) FROM business_events WHERE target_id = $2 AND type = 'identity.verification.verified.v1')::int AS events,
          (SELECT COUNT(*) FROM audit_log WHERE ressource_id = $2 AND action = 'identity_verification_verified')::int AS audits`,
        [ids.owner, ids.verification],
      );
      expect(proof.rows[0]).toMatchObject({ notifications: 1, events: 1, audits: 1 });
    } finally {
      client.release();
    }
  });

  it("attaches a temporary asset atomically to its target", async () => {
    await withRetry(() =>
      transactionalDb.transaction(async (tx) => {
        await mediaService.attachPublicMediaAsset(tx, {
          assetId: ids.asset,
          ownerUserId: ids.owner,
          targetType: "restaurant_logo",
          targetId: ids.restaurant,
        });
      }),
    );
    const client = await withRetry(() => pool.connect());
    try {
      const asset = await client.query(
        `SELECT status, target_type, target_id, expires_at
         FROM public_media_assets WHERE id = $1`,
        [ids.asset],
      );
      expect(asset.rows[0]).toMatchObject({
        status: "attached",
        target_type: "restaurant_logo",
        target_id: ids.restaurant,
        expires_at: null,
      });
    } finally {
      client.release();
    }
  });

  it("correlates a rejected decision without leaking its free-text reason", async () => {
    const reason = "La photographie est illisible, merci de renvoyer la pièce.";
    const result = await withRetry(() =>
      identityService.rejectPartnerIdentity(ids.admin, {
        verificationId: ids.rejectedVerification,
        reason,
      }),
    );
    expect(result).toMatchObject({ status: "rejected", rejectionReason: reason });
    await withRetry(() => eventService.processCausalityOutbox({ limit: 100 }));

    const client = await withRetry(() => pool.connect());
    try {
      const proof = await client.query(
        `SELECT event.payload::text AS payload,
          (SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND lien_id = $2)::int AS notifications,
          (SELECT COUNT(*) FROM audit_log WHERE ressource_id = $2 AND action = 'identity_verification_rejected')::int AS audits
         FROM business_events event
         WHERE event.target_id = $2 AND event.type = 'identity.verification.rejected.v1'`,
        [ids.rejectedOwner, ids.rejectedVerification],
      );
      expect(proof.rows[0]).toMatchObject({ notifications: 1, audits: 1 });
      expect(proof.rows[0].payload).not.toContain(reason);
    } finally {
      client.release();
    }
  });
});
