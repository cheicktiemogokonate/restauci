import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_MIGRATION_URL ou DATABASE_URL est requis.");
}

const repair = process.argv.includes("--repair");
const pool = new Pool({ connectionString: databaseUrl, max: 1 });

try {
  let repairs = { projectionsRequeued: 0, orphanNotificationsDeleted: 0 };
  if (repair) {
    // Supprimer d'abord les destinations devenues invalides, puis reconstruire
    // les projections manquantes dans un second statement. Une seule requête
    // SELECT laisse les deux fonctions observer le même snapshot PostgreSQL et
    // impose sinon un deuxième passage manuel pour obtenir une base saine.
    const orphanResult = await pool.query<{
      orphan_notifications_deleted: number;
    }>(`
      SELECT prune_orphan_notifications()::integer
        AS orphan_notifications_deleted
    `);
    const projectionResult = await pool.query<{
      projections_requeued: number;
    }>(`
      SELECT rebuild_causal_projections()::integer AS projections_requeued
    `);
    repairs = {
      projectionsRequeued: Number(
        projectionResult.rows[0]?.projections_requeued ?? 0,
      ),
      orphanNotificationsDeleted: Number(
        orphanResult.rows[0]?.orphan_notifications_deleted ?? 0,
      ),
    };
  }

  const [statuses, anomalies, deadLetters] = await Promise.all([
    pool.query<{ status: string; count: number }>(`
      SELECT status, COUNT(*)::int AS count
      FROM outbox_messages
      GROUP BY status
      ORDER BY status
    `),
    pool.query<{
      events_without_effect: number;
      completed_audit_effects_without_audit: number;
      completed_notification_effects_without_notification: number;
      orphan_notification_destinations: number;
      pilot_events_without_canonical_account: number;
    }>(`
      SELECT
        (SELECT COUNT(*)::int FROM business_events event
          WHERE NOT EXISTS (
            SELECT 1 FROM outbox_messages message WHERE message.event_id = event.id
          ) AND NOT EXISTS (
            SELECT 1 FROM event_effect_receipts receipt WHERE receipt.event_id = event.id
          )) AS events_without_effect,
        (SELECT COUNT(*)::int FROM event_effect_receipts receipt
          LEFT JOIN audit_log audit ON audit.event_id = receipt.event_id
          WHERE receipt.effect_type = 'audit.project'
            AND audit.id IS NULL) AS completed_audit_effects_without_audit,
        (SELECT COUNT(*)::int FROM event_effect_receipts receipt
          WHERE receipt.effect_type = 'notification.project'
            AND receipt.effect_payload IS NOT NULL
            AND (SELECT COUNT(*) FROM notifications notification
              WHERE notification.event_id = receipt.event_id)
              < jsonb_array_length(receipt.effect_payload -> 'items'))
          AS completed_notification_effects_without_notification,
        count_orphan_notifications()::int AS orphan_notification_destinations,
        (SELECT COUNT(*)::int FROM business_events event
          LEFT JOIN users target ON target.id = event.target_id
          WHERE event.type = 'admin.account.created.v1'
            AND event.target_type = 'admin_account'
            AND target.id IS NULL) AS pilot_events_without_canonical_account
    `),
    pool.query<{
      id: string;
      event_id: string;
      effect_type: string;
      attempts: number;
      last_error_code: string | null;
      dead_lettered_at: Date;
    }>(`
      SELECT id, event_id, effect_type, attempts, last_error_code, dead_lettered_at
      FROM outbox_messages
      WHERE status = 'dead_letter'
      ORDER BY dead_lettered_at
      LIMIT 100
    `),
  ]);
  const anomaly = anomalies.rows[0];
  const report = {
    generatedAt: new Date().toISOString(),
    mode: repair ? "repair" : "read-only",
    repairs,
    outboxByStatus: Object.fromEntries(
      statuses.rows.map((row) => [row.status, Number(row.count)]),
    ),
    anomalies: {
      eventsWithoutEffect: Number(anomaly?.events_without_effect ?? 0),
      completedAuditEffectsWithoutAudit: Number(
        anomaly?.completed_audit_effects_without_audit ?? 0,
      ),
      completedNotificationEffectsWithoutNotification: Number(
        anomaly?.completed_notification_effects_without_notification ?? 0,
      ),
      orphanNotificationDestinations: Number(
        anomaly?.orphan_notification_destinations ?? 0,
      ),
      pilotEventsWithoutCanonicalAccount: Number(
        anomaly?.pilot_events_without_canonical_account ?? 0,
      ),
    },
    deadLetters: deadLetters.rows,
  };
  console.log(JSON.stringify(report, null, 2));
  if (
    report.deadLetters.length > 0 ||
    Object.values(report.anomalies).some((count) => count > 0)
  ) {
    process.exitCode = 2;
  }
} finally {
  await pool.end();
}
