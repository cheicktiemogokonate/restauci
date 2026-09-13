import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import {
  warmApplicationDatabaseConnections,
  warmNeonTestPool,
} from "./support/neon-test-connection";

const enabled = process.env.RUN_PHASE10_DB_TESTS === "true";
const allowDevelopment =
  process.env.ALLOW_DEVELOPMENT_PHASE10_DB_TESTS === "true";
const databaseUrl = process.env.DATABASE_URL;
if (enabled && (!databaseUrl || !allowDevelopment)) {
  throw new Error(
    "Les tests DB Phase 10 exigent DATABASE_URL et ALLOW_DEVELOPMENT_PHASE10_DB_TESTS=true",
  );
}
const describeDb = enabled ? describe : describe.skip;

describeDb("phase 10 cross-cutting projections", () => {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 2,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 60_000,
    keepAlive: true,
  });
  const suffix = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const partnerAccountId = crypto.randomUUID();
  const restaurantId = crypto.randomUUID();
  const eventId = crypto.randomUUID();
  const correlationId = crypto.randomUUID();
  let events: typeof import("@/modules/events/server");
  let transactionalDb: typeof import("@/infrastructure/db/transaction")["transactionalDb"];

  beforeAll(async () => {
    await warmNeonTestPool(pool);
    ({ transactionalDb } = await import("@/infrastructure/db/transaction"));
    events = await import("@/modules/events/server");
    await warmApplicationDatabaseConnections();
    await pool.query(
      `INSERT INTO users (id, nom, email, password, telephone, role, created_at, updated_at)
       VALUES ($1, 'Partenaire Phase 10', $2, 'x', $3, 'partner', NOW(), NOW())`,
      [
        userId,
        `partner-phase10-${suffix}@example.test`,
        `+22510${suffix.replaceAll("-", "").slice(0, 8)}`,
      ],
    );
    await pool.query(
      `INSERT INTO partner_accounts (id, user_id, activity_type, created_at, updated_at)
       VALUES ($1, $2, 'restaurant', NOW(), NOW())`,
      [partnerAccountId, userId],
    );
    await pool.query(
      `INSERT INTO restaurants (
        id, partner_account_id, nom, slug, telephone, adresse,
        latitude, longitude, actif, created_at, updated_at
      ) VALUES ($1, $2, 'Restaurant Phase 10', $3, '+2250100101010',
        'Abidjan', 5.32, -4.01, true, NOW(), NOW())`,
      [restaurantId, partnerAccountId, `restaurant-phase10-${suffix}`],
    );
  }, 90_000);

  afterAll(async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM notifications WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM audit_log WHERE event_id = $1", [eventId]);
      await client.query("DELETE FROM business_events WHERE id = $1", [eventId]);
      await client.query("DELETE FROM restaurants WHERE id = $1", [restaurantId]);
      await client.query("DELETE FROM partner_accounts WHERE id = $1", [partnerAccountId]);
      await client.query("DELETE FROM users WHERE id = $1", [userId]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  }, 90_000);

  it("projette puis reconstruit Audit et Notifications depuis le même événement", async () => {
    await events.persistBusinessEvent(transactionalDb, {
      eventId,
      correlationId,
      type: "system.phase10.projection.v1",
      actor: { type: "system", id: "phase10-test" },
      partnerAccountId,
      target: { type: "restaurant", id: restaurantId },
      occurredAt: new Date(),
      payload: { operation: "projection_test" },
      effects: [
        {
          type: "audit.project",
          payload: { action: "restaurant_valide" },
        },
        {
          type: "notification.project",
          payload: {
            items: [
              {
                recipient: { type: "user", id: userId },
                template: "restaurant_validated",
                destination: { type: "restaurant", id: restaurantId },
              },
            ],
          },
        },
      ],
    });
    await pool.query(
      `UPDATE outbox_messages
       SET created_at = '1900-01-01', available_at = '1900-01-01'
       WHERE event_id = $1`,
      [eventId],
    );
    await events.processCausalityOutbox({ limit: 2 });

    const projected = await pool.query(
      `SELECT
        (SELECT COUNT(*)::int FROM audit_log WHERE event_id = $1) AS audits,
        (SELECT COUNT(*)::int FROM notifications WHERE event_id = $1) AS notifications,
        (SELECT COUNT(*)::int FROM event_effect_receipts
          WHERE event_id = $1 AND effect_payload IS NOT NULL) AS receipts`,
      [eventId],
    );
    expect(projected.rows[0]).toEqual({ audits: 1, notifications: 1, receipts: 2 });

    await pool.query("DELETE FROM notifications WHERE event_id = $1", [eventId]);
    await pool.query("DELETE FROM audit_log WHERE event_id = $1", [eventId]);
    const rebuilt = await events.rebuildCausalProjections();
    expect(rebuilt.requeued).toBeGreaterThanOrEqual(2);
    await events.processCausalityOutbox({ limit: 2 });
    const repaired = await pool.query(
      `SELECT
        (SELECT COUNT(*)::int FROM audit_log WHERE event_id = $1) AS audits,
        (SELECT COUNT(*)::int FROM notifications WHERE event_id = $1) AS notifications`,
      [eventId],
    );
    expect(repaired.rows[0]).toEqual({ audits: 1, notifications: 1 });
  }, 60_000);

  it("élague une destination orpheline selon la politique approuvée", async () => {
    const notificationId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO notifications (
        id, user_id, type, titre, message, lien_type, lien_id, created_at
      ) VALUES ($1, $2, 'systeme', 'Orpheline', 'Test Phase 10',
        'restaurant', $3, NOW())`,
      [notificationId, userId, crypto.randomUUID()],
    );
    const before = await pool.query<{ count: number }>(
      "SELECT count_orphan_notifications() AS count",
    );
    expect(Number(before.rows[0]?.count ?? 0)).toBeGreaterThanOrEqual(1);
    const pruned = await pool.query<{ count: number }>(
      "SELECT prune_orphan_notifications() AS count",
    );
    expect(Number(pruned.rows[0]?.count ?? 0)).toBeGreaterThanOrEqual(1);
    const remaining = await pool.query(
      "SELECT id FROM notifications WHERE id = $1",
      [notificationId],
    );
    expect(remaining.rowCount).toBe(0);
  });

  it("supprime automatiquement la projection quand sa cible disparaît", async () => {
    const notificationId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO notifications (
        id, user_id, type, titre, message, lien_type, lien_id, created_at
      ) VALUES ($1, $2, 'systeme', 'Cible', 'Test Phase 10',
        'restaurant', $3, NOW())`,
      [notificationId, userId, restaurantId],
    );
    await pool.query("DELETE FROM restaurants WHERE id = $1", [restaurantId]);
    const remaining = await pool.query(
      "SELECT id FROM notifications WHERE id = $1",
      [notificationId],
    );
    expect(remaining.rowCount).toBe(0);

    const retiredReceipt = await pool.query<{ retired: boolean }>(
      `SELECT effect_payload IS NULL AS retired
       FROM event_effect_receipts
       WHERE event_id = $1 AND effect_type = 'notification.project'`,
      [eventId],
    );
    expect(retiredReceipt.rows[0]).toEqual({ retired: true });

    await events.rebuildCausalProjections();
    const projectionStatus = await pool.query<{ status: string }>(
      `SELECT status FROM outbox_messages
       WHERE event_id = $1 AND effect_type = 'notification.project'`,
      [eventId],
    );
    expect(projectionStatus.rows[0]).toEqual({ status: "completed" });
  });
});
