import "server-only";

import { and, count, desc, eq, sql } from "drizzle-orm";
import { batchRead, db } from "@/infrastructure/db";
import { auditLog, users } from "@/infrastructure/db/schema";
import { withDatabaseReadRetry } from "@/infrastructure/db/read-retry";
import type { AdminAuditList, AdminAuditRowDTO } from "../contracts";

export async function listAdminAuditRecords(
  input: AdminAuditList,
) {
  const conditions = [];
  if (input.resourceType) {
    conditions.push(eq(auditLog.ressourceType, input.resourceType));
  }
  if (input.resourceId) {
    conditions.push(eq(auditLog.ressourceId, input.resourceId));
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (input.page - 1) * input.limit;
  const [items, totalRows] = await withDatabaseReadRetry(() =>
    batchRead([
      db
        .select({
          id: auditLog.id,
          adminId: auditLog.actorId,
          adminNom: sql<string>`COALESCE(
            ${users.nom},
            CASE ${auditLog.actorType}
              WHEN 'system' THEN 'Système Toutci'
              WHEN 'provider' THEN 'Fournisseur externe'
              WHEN 'partner' THEN 'Partenaire'
              WHEN 'client' THEN 'Client'
              WHEN 'driver' THEN 'Livreur'
              ELSE 'Acteur inconnu'
            END
          )`,
          action: auditLog.action,
          ressourceType: auditLog.ressourceType,
          ressourceId: auditLog.ressourceId,
          eventId: auditLog.eventId,
          correlationId: auditLog.correlationId,
          details: auditLog.details,
          createdAt: auditLog.createdAt,
        })
        .from(auditLog)
        .leftJoin(users, eq(auditLog.adminId, users.id))
        .where(where)
        .orderBy(desc(auditLog.createdAt))
        .limit(input.limit)
        .offset(offset),
      db.select({ total: count() }).from(auditLog).where(where),
    ]),
  );
  const total = Number(totalRows[0]?.total ?? 0);
  return {
    items: items as AdminAuditRowDTO[],
    total,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
  };
}
