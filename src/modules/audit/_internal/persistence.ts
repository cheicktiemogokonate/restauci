import "server-only";

import { db } from "@/infrastructure/db";
import { auditLog } from "@/infrastructure/db/schema";
import type { DbExecutor } from "@/infrastructure/db/transaction";
import { eq } from "drizzle-orm";
import type { AuditInput } from "../contracts";

export async function persistAuditLogRecord(
  executor: Pick<DbExecutor, "insert" | "select">,
  input: AuditInput,
) {
  const values = {
    adminId: input.actor.type === "admin" ? input.actor.id : null,
    actorType: input.actor.type,
    actorId: input.actor.id,
    action: input.action,
    ressourceType: input.resourceType,
    ressourceId: input.resourceId,
    eventId: input.eventId ?? null,
    correlationId: input.correlationId ?? null,
    partnerAccountId: input.partnerAccountId,
    details: input.details,
    createdAt: input.createdAt,
  };

  if (!input.eventId) {
    const [entry] = await executor.insert(auditLog).values(values).returning();
    return entry;
  }

  const [inserted] = await executor
    .insert(auditLog)
    .values(values)
    .onConflictDoNothing()
    .returning();
  if (inserted) return inserted;

  const [existing] = await executor
    .select()
    .from(auditLog)
    .where(eq(auditLog.eventId, input.eventId))
    .limit(1);
  if (!existing) throw new Error("AUDIT_EVENT_CONFLICT");
  return existing;
}

export function persistAuditLogBestEffortRecord(input: AuditInput) {
  return persistAuditLogRecord(db, input);
}
