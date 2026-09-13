import "server-only";

import { transactionalDb } from "@/infrastructure/db";
import { sql } from "drizzle-orm";
import { CAUSAL_RETENTION_POLICY } from "../model";

type CountRow = { count: string | number };
type StatusRow = { status: string; count: string | number };

function numberFrom(rows: CountRow[]) {
  return Number(rows[0]?.count ?? 0);
}

export async function applyRetentionPoliciesRecord() {
  return transactionalDb.transaction(async (tx) => {
    const completed = await tx.execute(sql`
      DELETE FROM outbox_messages
      WHERE status = 'completed'
        AND dead_lettered_at IS NULL
        AND completed_at < NOW() - (${CAUSAL_RETENTION_POLICY.completedOutboxDays} * INTERVAL '1 day')
      RETURNING id
    `);
    const resolvedDeadLetters = await tx.execute(sql`
      DELETE FROM outbox_messages
      WHERE status = 'completed'
        AND dead_lettered_at IS NOT NULL
        AND resolved_at < NOW() - (${CAUSAL_RETENTION_POLICY.resolvedDeadLetterYears} * INTERVAL '1 year')
      RETURNING id
    `);
    const audits = await tx.execute(sql`
      DELETE FROM audit_log
      WHERE created_at < NOW() - (${CAUSAL_RETENTION_POLICY.auditYears} * INTERVAL '1 year')
      RETURNING id
    `);
    const events = await tx.execute(sql`
      DELETE FROM business_events AS event
      WHERE event.retained_until < NOW()
        AND NOT EXISTS (
          SELECT 1 FROM outbox_messages AS message WHERE message.event_id = event.id
        )
      RETURNING id
    `);
    return {
      completedOutboxDeleted: completed.rowCount ?? 0,
      resolvedDeadLettersDeleted: resolvedDeadLetters.rowCount ?? 0,
      auditsDeleted: audits.rowCount ?? 0,
      eventsDeleted: events.rowCount ?? 0,
    };
  });
}

export async function reconcileCausalityRecord() {
  const [
    statusResult,
    noEffectResult,
    missingAuditResult,
    missingNotificationResult,
    orphanNotificationResult,
    missingPilotTargetResult,
  ] = await Promise.all([
      transactionalDb.execute(sql`
        SELECT status, COUNT(*)::int AS count
        FROM outbox_messages
        GROUP BY status
        ORDER BY status
      `),
      transactionalDb.execute(sql`
        SELECT COUNT(*)::int AS count
        FROM business_events AS event
        WHERE NOT EXISTS (
          SELECT 1 FROM outbox_messages AS message WHERE message.event_id = event.id
        )
          AND NOT EXISTS (
            SELECT 1 FROM event_effect_receipts AS receipt WHERE receipt.event_id = event.id
          )
      `),
      transactionalDb.execute(sql`
        SELECT COUNT(*)::int AS count
        FROM event_effect_receipts AS receipt
        LEFT JOIN audit_log AS audit ON audit.event_id = receipt.event_id
        WHERE receipt.effect_type = 'audit.project'
          AND audit.id IS NULL
      `),
      transactionalDb.execute(sql`
        SELECT COUNT(*)::int AS count
        FROM event_effect_receipts AS receipt
        WHERE receipt.effect_type = 'notification.project'
          AND receipt.effect_payload IS NOT NULL
          AND (
            SELECT COUNT(*) FROM notifications AS notification
            WHERE notification.event_id = receipt.event_id
          ) < jsonb_array_length(receipt.effect_payload -> 'items')
      `),
      transactionalDb.execute(sql`
        SELECT count_orphan_notifications()::int AS count
      `),
      transactionalDb.execute(sql`
        SELECT COUNT(*)::int AS count
        FROM business_events AS event
        LEFT JOIN users AS target ON target.id = event.target_id
        WHERE event.type = 'admin.account.created.v1'
          AND event.target_type = 'admin_account'
          AND target.id IS NULL
      `),
    ]);

  const outboxByStatus = Object.fromEntries(
    (statusResult.rows as StatusRow[]).map((row) => [row.status, Number(row.count)]),
  );
  const anomalies = {
    eventsWithoutEffect: numberFrom(noEffectResult.rows as CountRow[]),
    completedAuditEffectsWithoutAudit: numberFrom(
      missingAuditResult.rows as CountRow[],
    ),
    completedNotificationEffectsWithoutNotification: numberFrom(
      missingNotificationResult.rows as CountRow[],
    ),
    orphanNotificationDestinations: numberFrom(
      orphanNotificationResult.rows as CountRow[],
    ),
    pilotEventsWithoutCanonicalAccount: numberFrom(
      missingPilotTargetResult.rows as CountRow[],
    ),
  };
  return {
    outboxByStatus,
    anomalies,
    healthy:
      Object.values(anomalies).every((count) => count === 0) &&
      (outboxByStatus.dead_letter ?? 0) === 0,
  };
}

export async function rebuildCausalProjectionsRecord() {
  const result = await transactionalDb.execute(sql`
    SELECT rebuild_causal_projections()::int AS count
  `);
  return {
    requeued: numberFrom(result.rows as CountRow[]),
  };
}
