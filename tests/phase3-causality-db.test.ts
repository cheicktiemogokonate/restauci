import { hash } from "bcryptjs";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  warmApplicationDatabaseConnections,
  warmNeonTestPool,
} from "./support/neon-test-connection";

const enabled = process.env.RUN_PHASE3_DB_TESTS === "true";
const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  (process.env.ALLOW_DEVELOPMENT_DB_TESTS === "true"
    ? process.env.DATABASE_URL
    : undefined);
if (enabled && !databaseUrl) throw new Error("TEST_DATABASE_URL est obligatoire");
const describeDatabase = enabled ? describe : describe.skip;

describeDatabase("Phase 3 causal foundation", () => {
  const pool = new Pool({
    connectionString: databaseUrl!,
    max: 2,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 60_000,
    keepAlive: true,
  });
  const suffix = crypto.randomUUID();
  const phoneSuffix = String(Date.now()).slice(-8);
  const actorId = crypto.randomUUID();
  const actorPassword = "Phase3-Actor-Password!7";
  const targetIds: string[] = [];
  const eventIds: string[] = [];
  const auditIds: string[] = [];

  beforeAll(async () => {
    await warmNeonTestPool(pool);
    await warmApplicationDatabaseConnections();
    await pool.query(
      `INSERT INTO users (
         id, email, password, nom, telephone, role, email_verifie, created_at, updated_at
       ) VALUES ($1, $2, $3, 'Phase 3 Actor', $4, 'admin', true, NOW(), NOW())`,
      [
        actorId,
        `phase3-actor-${suffix}@example.test`,
        await hash(actorPassword, 12),
        `+22507${phoneSuffix}`,
      ],
    );
  }, 90_000);

  afterAll(async () => {
    await pool.query(
      "DELETE FROM audit_log WHERE event_id = ANY($1::uuid[]) OR actor_id = $2 OR id = ANY($3::varchar[])",
      [eventIds, actorId, auditIds],
    );
    await pool.query("DELETE FROM outbox_messages WHERE event_id = ANY($1::uuid[])", [
      eventIds,
    ]);
    await pool.query("DELETE FROM business_events WHERE id = ANY($1::uuid[])", [
      eventIds,
    ]);
    await pool.query("DELETE FROM users WHERE id = ANY($1::varchar[])", [
      [...targetIds, actorId],
    ]);
    await pool.end();
  }, 90_000);

  it("writes the pilot account, event, and outbox atomically", async () => {
    const { createAdminAccount } = await import("@/modules/admin-accounts/server");
    const result = await createAdminAccount(
      { adminId: actorId },
      {
        email: `phase3-target-${suffix}@example.test`,
        nom: "Phase 3 Target",
        telephone: `+22505${phoneSuffix}`,
        actorPassword,
      },
    );
    targetIds.push(result.account.id);

    const causal = await pool.query<{
      event_id: string;
      correlation_id: string;
      actor_type: string;
      status: string;
      audit_count: number;
    }>(
      `SELECT event.id AS event_id, event.correlation_id, event.actor_type,
              message.status,
              (SELECT COUNT(*)::int FROM audit_log audit
               WHERE audit.event_id = event.id) AS audit_count
       FROM business_events event
       JOIN outbox_messages message ON message.event_id = event.id
       WHERE event.type = 'admin.account.created.v1'
         AND event.target_id = $1`,
      [result.account.id],
    );
    const event = causal.rows[0];
    expect(event).toMatchObject({
      actor_type: "admin",
      status: "pending",
      audit_count: 0,
    });
    expect(event?.correlation_id).toMatch(/^[0-9a-f-]{36}$/);
    eventIds.push(event!.event_id);
    await pool.query(
      `UPDATE outbox_messages
       SET created_at = NOW() - INTERVAL '100 years', available_at = NOW()
       WHERE event_id = $1`,
      [event!.event_id],
    );
  });

  it("projects the audit once and stays idempotent on replay", async () => {
    const { processCausalityOutbox } = await import("@/modules/events/server");
    const first = await processCausalityOutbox({ limit: 1 });
    expect(first.completed).toBe(1);

    const eventId = eventIds[0]!;
    const firstProjection = await pool.query<{
      count: number;
      actor_type: string;
      actor_id: string;
      receipt_count: number;
    }>(
      `SELECT COUNT(*)::int AS count, MIN(actor_type::text) AS actor_type,
              MIN(actor_id) AS actor_id,
              (SELECT COUNT(*)::int FROM event_effect_receipts receipt
               WHERE receipt.event_id = $1) AS receipt_count
       FROM audit_log WHERE event_id = $1`,
      [eventId],
    );
    expect(firstProjection.rows[0]).toEqual({
      count: 1,
      actor_type: "admin",
      actor_id: actorId,
      receipt_count: 1,
    });

    await pool.query(
      `UPDATE outbox_messages
       SET status = 'retry', attempts = 0, available_at = NOW(), locked_at = NULL,
           completed_at = NULL, updated_at = NOW()
       WHERE event_id = $1`,
      [eventId],
    );
    const replay = await processCausalityOutbox({ limit: 1 });
    expect(replay.completed).toBe(1);
    const replayProjection = await pool.query<{ count: number; receipt_count: number }>(
      `SELECT COUNT(*)::int AS count,
              (SELECT COUNT(*)::int FROM event_effect_receipts receipt
               WHERE receipt.event_id = $1) AS receipt_count
       FROM audit_log WHERE event_id = $1`,
      [eventId],
    );
    expect(replayProjection.rows[0]).toEqual({ count: 1, receipt_count: 1 });
  });

  it("rolls the causal envelope back with its command transaction", async () => {
    const { transactionalDb } = await import("@/infrastructure/db");
    const { persistBusinessEvent } = await import("@/modules/events/server");
    const eventId = crypto.randomUUID();
    await expect(
      transactionalDb.transaction(async (tx) => {
        await persistBusinessEvent(tx, {
          eventId,
          correlationId: crypto.randomUUID(),
          type: "test.rollback.probe.v1",
          actor: { type: "system", id: "toutci" },
          partnerAccountId: null,
          target: { type: "probe", id: crypto.randomUUID() },
          occurredAt: new Date(),
          payload: { status: "created" },
          effects: [
            {
              type: "audit.project",
              payload: { action: "catalogue_modifie" },
            },
          ],
        });
        throw new Error("ROLLBACK_PROBE");
      }),
    ).rejects.toThrow("ROLLBACK_PROBE");
    const rows = await pool.query("SELECT id FROM business_events WHERE id = $1", [
      eventId,
    ]);
    expect(rows.rowCount).toBe(0);
  });

  it("records a system actor without borrowing an administrator identity", async () => {
    const { transactionalDb } = await import("@/infrastructure/db");
    const { persistAuditLog } = await import("@/modules/audit/server");
    const entry = await persistAuditLog(transactionalDb, {
      actor: { type: "system", id: "toutci:test" },
      action: "abonnement_expire",
      resourceType: "probe",
      resourceId: crypto.randomUUID(),
      partnerAccountId: null,
      details: { cause: "test" },
    });
    auditIds.push(entry.id);
    expect(entry).toMatchObject({
      adminId: null,
      actorType: "system",
      actorId: "toutci:test",
    });
  });

  it("retries an unknown effect, dead-letters it, and allows an explicit requeue", async () => {
    const { processCausalityOutbox, requeueCausalityDeadLetter } = await import(
      "@/modules/events/server"
    );
    const eventId = crypto.randomUUID();
    const messageId = crypto.randomUUID();
    eventIds.push(eventId);
    await pool.query(
      `INSERT INTO business_events (
         id, correlation_id, type, actor_type, actor_id, target_type, target_id,
         payload, occurred_at, retained_until, created_at
       ) VALUES ($1, $2, 'test.dead.letter.v1', 'system', 'toutci', 'probe', $3,
         '{}'::jsonb, NOW(), NOW() + INTERVAL '5 years', NOW())`,
      [eventId, crypto.randomUUID(), crypto.randomUUID()],
    );
    await pool.query(
      `INSERT INTO outbox_messages (
         id, event_id, effect_type, payload, status, attempts, max_attempts,
         available_at, created_at, updated_at
       ) VALUES ($1, $2, 'unsupported.effect', '{}'::jsonb, 'pending', 0, 5,
         NOW(), NOW() - INTERVAL '100 years', NOW())`,
      [messageId, eventId],
    );

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await processCausalityOutbox({ limit: 1 });
      if (attempt < 5) {
        await pool.query(
          "UPDATE outbox_messages SET available_at = NOW() WHERE id = $1",
          [messageId],
        );
      }
    }
    const failed = await pool.query<{
      status: string;
      attempts: number;
      last_error_code: string;
    }>(
      "SELECT status, attempts, last_error_code FROM outbox_messages WHERE id = $1",
      [messageId],
    );
    expect(failed.rows[0]).toEqual({
      status: "dead_letter",
      attempts: 5,
      last_error_code: "UNKNOWN_EFFECT_TYPE",
    });

    await expect(requeueCausalityDeadLetter(messageId)).resolves.toEqual({
      id: messageId,
    });
    const requeued = await pool.query<{ status: string; attempts: number }>(
      "SELECT status, attempts FROM outbox_messages WHERE id = $1",
      [messageId],
    );
    expect(requeued.rows[0]).toEqual({ status: "retry", attempts: 0 });
  });

  it("purges only records whose validated retention window elapsed", async () => {
    const { applyCausalityRetentionPolicies } = await import(
      "@/modules/events/server"
    );
    const eventId = crypto.randomUUID();
    const auditId = crypto.randomUUID();
    eventIds.push(eventId);
    await pool.query(
      `INSERT INTO business_events (
         id, correlation_id, type, actor_type, actor_id, target_type, target_id,
         payload, occurred_at, retained_until, created_at
       ) VALUES ($1, $2, 'test.retention.probe.v1', 'system', 'toutci', 'probe', $3,
         '{}'::jsonb, NOW() - INTERVAL '6 years', NOW() - INTERVAL '1 day',
         NOW() - INTERVAL '6 years')`,
      [eventId, crypto.randomUUID(), crypto.randomUUID()],
    );
    await pool.query(
      `INSERT INTO outbox_messages (
         id, event_id, effect_type, payload, status, attempts, max_attempts,
         available_at, completed_at, created_at, updated_at
       ) VALUES ($1, $2, 'audit.project', '{}'::jsonb, 'completed', 1, 5,
         NOW() - INTERVAL '31 days', NOW() - INTERVAL '31 days',
         NOW() - INTERVAL '6 years', NOW() - INTERVAL '31 days')`,
      [crypto.randomUUID(), eventId],
    );
    await pool.query(
      `INSERT INTO audit_log (
         id, admin_id, actor_type, actor_id, action, ressource_type, ressource_id,
         details, created_at
       ) VALUES ($1, NULL, 'system', 'toutci', 'catalogue_modifie', 'probe', $2,
         NULL, NOW() - INTERVAL '6 years')`,
      [auditId, crypto.randomUUID()],
    );

    const result = await applyCausalityRetentionPolicies();
    expect(result).toMatchObject({
      completedOutboxDeleted: expect.any(Number),
      auditsDeleted: expect.any(Number),
      eventsDeleted: expect.any(Number),
    });
    const retained = await pool.query(
      `SELECT
         EXISTS (SELECT 1 FROM business_events WHERE id = $1) AS event_exists,
         EXISTS (SELECT 1 FROM audit_log WHERE id = $2) AS audit_exists`,
      [eventId, auditId],
    );
    expect(retained.rows[0]).toEqual({ event_exists: false, audit_exists: false });
  });

  it("reports a reconciled pilot without missing effects", async () => {
    const { reconcileCausality } = await import("@/modules/events/server");
    const result = await reconcileCausality();
    expect(result.anomalies).toEqual({
      eventsWithoutEffect: 0,
      completedAuditEffectsWithoutAudit: 0,
      completedNotificationEffectsWithoutNotification: 0,
      orphanNotificationDestinations: 0,
      pilotEventsWithoutCanonicalAccount: 0,
    });
  });
});
