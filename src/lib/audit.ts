import { db }            from "@/lib/db";
import { auditActionEnum, auditLog } from "@/lib/db/schema";
import { createLogger }  from "@/lib/logger";
import type { DbExecutor } from "@/lib/db/transaction";

const log = createLogger("audit");

export type AuditAction = (typeof auditActionEnum.enumValues)[number];

export interface AuditInput {
  adminId: string;
  action: AuditAction;
  ressourceType: string;
  ressourceId: string;
  details?: Record<string, unknown>;
}

/** Audit métier obligatoire : une erreur annule la transaction appelante. */
export async function persistAuditLog(
  executor: Pick<DbExecutor, "insert">,
  input: AuditInput,
) {
  const [entry] = await executor.insert(auditLog).values(input).returning();
  return entry;
}

/**
 * Enregistre une action admin dans le journal d'audit.
 * Best-effort : ne bloque jamais l'action principale si ça échoue.
 */
export async function logAuditActionBestEffort({
  adminId,
  action,
  ressourceType,
  ressourceId,
  details,
}: AuditInput): Promise<void> {
  try {
    await persistAuditLog(db, {
      adminId,
      action,
      ressourceType,
      ressourceId,
      details,
    });
  } catch (err) {
    log.error({ err, action, ressourceId }, "Échec écriture audit log");
  }
}

/** @deprecated Nom ambigu : préférer persistAuditLog ou logAuditActionBestEffort. */
export const logAuditAction = logAuditActionBestEffort;
