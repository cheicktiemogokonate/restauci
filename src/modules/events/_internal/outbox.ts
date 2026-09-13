import "server-only";

import { persistAuditLog } from "@/modules/audit/server";
import { auditProjectionEffectSchema } from "@/modules/audit/contracts";
import { notificationProjectionEffectSchema } from "@/modules/notifications/contracts";
import { persistNotificationProjection } from "@/modules/notifications/server";
import { transactionalDb } from "@/infrastructure/db";
import {
  businessEvents,
  eventEffectReceipts,
  outboxMessages,
} from "@/infrastructure/db/schema";
import { and, eq, sql } from "drizzle-orm";
import {
  getOutboxRetryDelaySeconds,
  OUTBOX_LOCK_TIMEOUT_MINUTES,
} from "../model";

interface ClaimedOutboxMessage {
  id: string;
  attempts: number;
  max_attempts: number;
}

const OUTBOX_CONSUMER_CONCURRENCY = 5;

function getSafeErrorCode(error: unknown): string {
  if (error instanceof Error && /^[A-Z][A-Z0-9_]{2,80}$/.test(error.message)) {
    return error.message;
  }
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = String((error as { code?: unknown }).code ?? "");
    if (/^[A-Z0-9_]{2,20}$/.test(code)) return `DB_${code}`;
  }
  return "UNCLASSIFIED_CONSUMER_ERROR";
}

async function claimOutboxMessages(limit: number) {
  return transactionalDb.transaction(async (tx) => {
    const result = await tx.execute(sql`
      WITH candidates AS (
        SELECT id
        FROM outbox_messages
        WHERE (
          status IN ('pending', 'retry')
          AND available_at <= NOW()
        ) OR (
          status = 'processing'
          AND locked_at < NOW() - (${OUTBOX_LOCK_TIMEOUT_MINUTES} * INTERVAL '1 minute')
        )
        ORDER BY created_at, id
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE outbox_messages AS message
      SET status = 'processing',
          attempts = message.attempts + 1,
          locked_at = NOW(),
          updated_at = NOW()
      FROM candidates
      WHERE message.id = candidates.id
      RETURNING message.id, message.attempts, message.max_attempts
    `);
    return result.rows as unknown as ClaimedOutboxMessage[];
  });
}

async function markFailure(message: ClaimedOutboxMessage, error: unknown) {
  const deadLetter = message.attempts >= message.max_attempts;
  const delaySeconds = getOutboxRetryDelaySeconds(message.attempts);
  await transactionalDb
    .update(outboxMessages)
    .set({
      status: deadLetter ? "dead_letter" : "retry",
      availableAt: deadLetter
        ? new Date()
        : new Date(Date.now() + delaySeconds * 1_000),
      lockedAt: null,
      deadLetteredAt: deadLetter ? new Date() : undefined,
      lastErrorCode: getSafeErrorCode(error),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(outboxMessages.id, message.id),
        eq(outboxMessages.status, "processing"),
      ),
    );
  return deadLetter ? "dead_letter" : "retry";
}

async function consumeOutboxMessage(message: ClaimedOutboxMessage) {
  try {
    return await transactionalDb.transaction(async (tx) => {
      const [record] = await tx
        .select({
          id: outboxMessages.id,
          effectType: outboxMessages.effectType,
          effectPayload: outboxMessages.payload,
          deadLetteredAt: outboxMessages.deadLetteredAt,
          eventId: businessEvents.id,
          correlationId: businessEvents.correlationId,
          actorType: businessEvents.actorType,
          actorId: businessEvents.actorId,
          partnerAccountId: businessEvents.partnerAccountId,
          targetType: businessEvents.targetType,
          targetId: businessEvents.targetId,
          occurredAt: businessEvents.occurredAt,
        })
        .from(outboxMessages)
        .innerJoin(businessEvents, eq(outboxMessages.eventId, businessEvents.id))
        .where(
          and(
            eq(outboxMessages.id, message.id),
            eq(outboxMessages.status, "processing"),
          ),
        )
        .limit(1);
      if (!record) return "skipped" as const;

      if (record.effectType === "audit.project") {
        const effect = auditProjectionEffectSchema.parse({
          type: record.effectType,
          payload: record.effectPayload,
        });
        await persistAuditLog(tx, {
          actor: { type: record.actorType, id: record.actorId },
          action: effect.payload.action,
          resourceType: record.targetType,
          resourceId: record.targetId,
          eventId: record.eventId,
          correlationId: record.correlationId,
          partnerAccountId: record.partnerAccountId,
          details: effect.payload.details,
          createdAt: record.occurredAt,
        });
      } else if (record.effectType === "notification.project") {
        const effect = notificationProjectionEffectSchema.parse({
          type: record.effectType,
          payload: record.effectPayload,
        });
        await persistNotificationProjection(tx, effect, {
          eventId: record.eventId,
          correlationId: record.correlationId,
        });
      } else {
        throw new Error("UNKNOWN_EFFECT_TYPE");
      }

      await tx
        .insert(eventEffectReceipts)
        .values({
          eventId: record.eventId,
          effectType: record.effectType,
          effectPayload: record.effectPayload,
        })
        .onConflictDoNothing();

      await tx
        .update(outboxMessages)
        .set({
          status: "completed",
          completedAt: new Date(),
          resolvedAt: record.deadLetteredAt ? new Date() : null,
          lockedAt: null,
          lastErrorCode: null,
          updatedAt: new Date(),
        })
        .where(eq(outboxMessages.id, message.id));
      return "completed" as const;
    });
  } catch (error) {
    return markFailure(message, error);
  }
}

export async function processOutboxBatchRecord(limit: number) {
  const claimed = await claimOutboxMessages(limit);
  const outcomes: Awaited<ReturnType<typeof consumeOutboxMessage>>[] = [];
  for (
    let offset = 0;
    offset < claimed.length;
    offset += OUTBOX_CONSUMER_CONCURRENCY
  ) {
    outcomes.push(
      ...(await Promise.all(
        claimed
          .slice(offset, offset + OUTBOX_CONSUMER_CONCURRENCY)
          .map((message) => consumeOutboxMessage(message)),
      )),
    );
  }
  return {
    claimed: claimed.length,
    completed: outcomes.filter((outcome) => outcome === "completed").length,
    retries: outcomes.filter((outcome) => outcome === "retry").length,
    deadLetters: outcomes.filter((outcome) => outcome === "dead_letter").length,
    skipped: outcomes.filter((outcome) => outcome === "skipped").length,
  };
}

export async function requeueDeadLetterRecord(messageId: string) {
  const [message] = await transactionalDb
    .update(outboxMessages)
    .set({
      status: "retry",
      attempts: 0,
      availableAt: new Date(),
      lockedAt: null,
      resolvedAt: null,
      lastErrorCode: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(outboxMessages.id, messageId),
        eq(outboxMessages.status, "dead_letter"),
      ),
    )
    .returning({ id: outboxMessages.id });
  return message ?? null;
}
