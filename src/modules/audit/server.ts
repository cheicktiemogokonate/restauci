import "server-only";

import { createLogger } from "@/infrastructure/logger";
import type { DbExecutor } from "@/infrastructure/db/transaction";
import {
  adminAuditListSchema,
  auditInputSchema,
  type AdminAuditListInput,
  type AuditInput,
  type LegacyAdminAuditInput,
} from "./contracts";
import { listAdminAuditRecords } from "./_internal/query";
import {
  persistAuditLogBestEffortRecord,
  persistAuditLogRecord,
} from "./_internal/persistence";

const log = createLogger("audit");

function normalizeAuditInput(
  input: AuditInput | LegacyAdminAuditInput,
): AuditInput {
  if ("adminId" in input) {
    return auditInputSchema.parse({
      actor: { type: "admin", id: input.adminId },
      action: input.action,
      resourceType: input.ressourceType,
      resourceId: input.ressourceId,
      details: input.details,
      partnerAccountId: null,
    });
  }
  return auditInputSchema.parse(input);
}

/** Audit métier obligatoire ; une erreur annule la transaction appelante. */
export function persistAuditLog(
  executor: Pick<DbExecutor, "insert" | "select">,
  input: AuditInput | LegacyAdminAuditInput,
) {
  return persistAuditLogRecord(executor, normalizeAuditInput(input));
}

/** Compatibilité des anciens flux admin qui journalisent hors transaction. */
export async function logAuditActionBestEffort(
  input: AuditInput | LegacyAdminAuditInput,
): Promise<void> {
  const normalized = normalizeAuditInput(input);
  try {
    await persistAuditLogBestEffortRecord(normalized);
  } catch (error) {
    log.error(
      { error, action: normalized.action, resourceId: normalized.resourceId },
      "Échec écriture audit log",
    );
  }
}

/** @deprecated Préférer persistAuditLog ou logAuditActionBestEffort. */
export const logAuditAction = logAuditActionBestEffort;

export function listAdminAudit(input: AdminAuditListInput = {}) {
  return listAdminAuditRecords(adminAuditListSchema.parse(input));
}
