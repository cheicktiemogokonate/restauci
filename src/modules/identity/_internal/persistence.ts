import "server-only";

import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  partnerAccounts,
  partnerIdentityDocuments,
  partnerIdentityVerifications,
  users,
} from "@/lib/db/schema";
import type { DbExecutor, TransactionExecutor } from "@/lib/db/transaction";
import type {
  AdminIdentityVerificationDetailsDTO,
  IdentityDocumentDTO,
  ListIdentityVerificationsInput,
  PartnerIdentityVerificationDTO,
} from "../contracts";

type VerificationRow = typeof partnerIdentityVerifications.$inferSelect;
type DocumentRow = typeof partnerIdentityDocuments.$inferSelect;

function documentDTO(row: DocumentRow): IdentityDocumentDTO {
  return {
    id: row.id,
    side: row.side,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    uploadedAt: row.uploadedAt.toISOString(),
  };
}

export function partnerVerificationDTO(
  row: VerificationRow,
  documents: DocumentRow[],
): PartnerIdentityVerificationDTO {
  return {
    id: row.id,
    partnerAccountId: row.partnerAccountId,
    status: row.status,
    legalName: row.legalName,
    documentType: row.documentType,
    documentCountryCode: row.documentCountryCode,
    documentExpiresOn: row.documentExpiresOn,
    rejectionReason: row.rejectionReason,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    documents: documents.map(documentDTO),
  };
}

export async function ensurePartnerVerificationDraft(
  partnerAccountId: string,
) {
  await db
    .insert(partnerIdentityVerifications)
    .values({ partnerAccountId })
    .onConflictDoNothing({
      target: partnerIdentityVerifications.partnerAccountId,
    });
  const verification = await db.query.partnerIdentityVerifications.findFirst({
    where: eq(
      partnerIdentityVerifications.partnerAccountId,
      partnerAccountId,
    ),
  });
  if (!verification) throw new Error("Création du dossier KYC impossible.");
  return verification;
}

export async function getPartnerVerificationRecord(
  partnerAccountId: string,
  executor: DbExecutor = db,
) {
  return executor.query.partnerIdentityVerifications.findFirst({
    where: eq(
      partnerIdentityVerifications.partnerAccountId,
      partnerAccountId,
    ),
    with: { documents: { orderBy: [asc(partnerIdentityDocuments.side)] } },
  });
}

export async function lockVerificationRecord(
  tx: TransactionExecutor,
  verificationId: string,
) {
  await tx.execute(
    sql`SELECT id FROM ${partnerIdentityVerifications} WHERE id = ${verificationId} FOR UPDATE`,
  );
  return tx.query.partnerIdentityVerifications.findFirst({
    where: eq(partnerIdentityVerifications.id, verificationId),
    with: { documents: { orderBy: [asc(partnerIdentityDocuments.side)] } },
  });
}

export async function replaceIdentityDocumentRecord(
  tx: TransactionExecutor,
  input: {
    verificationId: string;
    side: "front" | "back";
    storageKey: string;
    contentType: "image/jpeg" | "image/png" | "application/pdf";
    sizeBytes: number;
    sha256: string;
  },
) {
  const previous = await tx.query.partnerIdentityDocuments.findFirst({
    where: and(
      eq(partnerIdentityDocuments.verificationId, input.verificationId),
      eq(partnerIdentityDocuments.side, input.side),
    ),
  });
  const [document] = await tx
    .insert(partnerIdentityDocuments)
    .values(input)
    .onConflictDoUpdate({
      target: [
        partnerIdentityDocuments.verificationId,
        partnerIdentityDocuments.side,
      ],
      set: {
        storageKey: input.storageKey,
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        sha256: input.sha256,
        uploadedAt: new Date(),
      },
    })
    .returning();
  if (!document) throw new Error("Enregistrement du document impossible.");
  return { document, previousStorageKey: previous?.storageKey ?? null };
}

export async function getDocumentForPartner(
  documentId: string,
  partnerAccountId: string,
) {
  const [row] = await db
    .select({
      id: partnerIdentityDocuments.id,
      storageKey: partnerIdentityDocuments.storageKey,
      contentType: partnerIdentityDocuments.contentType,
    })
    .from(partnerIdentityDocuments)
    .innerJoin(
      partnerIdentityVerifications,
      eq(
        partnerIdentityVerifications.id,
        partnerIdentityDocuments.verificationId,
      ),
    )
    .where(
      and(
        eq(partnerIdentityDocuments.id, documentId),
        eq(
          partnerIdentityVerifications.partnerAccountId,
          partnerAccountId,
        ),
      ),
    )
    .limit(1);
  return row;
}

export async function getDocumentForAdmin(documentId: string) {
  return db.query.partnerIdentityDocuments.findFirst({
    where: eq(partnerIdentityDocuments.id, documentId),
    columns: { id: true, storageKey: true, contentType: true },
  });
}

export async function listIdentityVerificationRecords(
  input: ListIdentityVerificationsInput,
) {
  const filters = [];
  if (input.status) filters.push(eq(partnerIdentityVerifications.status, input.status));
  if (input.search) {
    const pattern = `%${input.search}%`;
    filters.push(
      or(
        ilike(partnerIdentityVerifications.legalName, pattern),
        ilike(users.nom, pattern),
        ilike(users.email, pattern),
      )!,
    );
  }
  const where = filters.length > 0 ? and(...filters) : undefined;
  const offset = (input.page - 1) * input.limit;
  const base = db
    .select({
      id: partnerIdentityVerifications.id,
      partnerAccountId: partnerIdentityVerifications.partnerAccountId,
      status: partnerIdentityVerifications.status,
      legalName: partnerIdentityVerifications.legalName,
      activityType: partnerAccounts.activityType,
      accountName: users.nom,
      accountEmail: users.email,
      submittedAt: partnerIdentityVerifications.submittedAt,
      reviewedAt: partnerIdentityVerifications.reviewedAt,
    })
    .from(partnerIdentityVerifications)
    .innerJoin(
      partnerAccounts,
      eq(partnerAccounts.id, partnerIdentityVerifications.partnerAccountId),
    )
    .innerJoin(users, eq(users.id, partnerAccounts.userId));

  const countQuery = db
    .select({ total: count() })
    .from(partnerIdentityVerifications)
    .innerJoin(
      partnerAccounts,
      eq(partnerAccounts.id, partnerIdentityVerifications.partnerAccountId),
    )
    .innerJoin(users, eq(users.id, partnerAccounts.userId));

  const [items, totalRows] = await Promise.all([
    base
      .where(where)
      .orderBy(
        sql`${partnerIdentityVerifications.status} = 'pending' DESC`,
        desc(partnerIdentityVerifications.submittedAt),
        desc(partnerIdentityVerifications.createdAt),
      )
      .limit(input.limit)
      .offset(offset),
    countQuery.where(where),
  ]);
  const total = totalRows[0]?.total ?? 0;
  return {
    items: items.map((item) => ({
      ...item,
      submittedAt: item.submittedAt?.toISOString() ?? null,
      reviewedAt: item.reviewedAt?.toISOString() ?? null,
    })),
    total,
    page: input.page,
    totalPages: Math.max(1, Math.ceil(total / input.limit)),
  };
}

export async function getAdminVerificationRecord(
  verificationId: string,
): Promise<AdminIdentityVerificationDetailsDTO | null> {
  const row = await db.query.partnerIdentityVerifications.findFirst({
    where: eq(partnerIdentityVerifications.id, verificationId),
    with: {
      documents: { orderBy: [asc(partnerIdentityDocuments.side)] },
      partnerAccount: { with: { user: true } },
      reviewedByAdmin: true,
    },
  });
  if (!row) return null;
  return {
    ...partnerVerificationDTO(row, row.documents),
    activityType: row.partnerAccount.activityType,
    accountName: row.partnerAccount.user.nom,
    accountEmail: row.partnerAccount.user.email,
    accountPhone: row.partnerAccount.user.telephone,
    reviewedByAdminName: row.reviewedByAdmin?.nom ?? null,
  };
}
