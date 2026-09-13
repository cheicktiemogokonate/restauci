import "server-only";

import { and, asc, count, desc, eq, ilike, lt, or, sql } from "drizzle-orm";
import { db } from "@/infrastructure/db";
import { env } from "@/infrastructure/env";
import {
  partnerAccounts,
  partnerIdentityDocuments,
  partnerIdentityVerifications,
  users,
} from "@/infrastructure/db/schema";
import type { DbExecutor, TransactionExecutor } from "@/infrastructure/db/transaction";
import type {
  AdminIdentityVerificationDetailsDTO,
  IdentityDocumentDTO,
  ListIdentityVerificationsInput,
  PartnerIdentityVerificationDTO,
} from "../contracts";

type VerificationRow = typeof partnerIdentityVerifications.$inferSelect;
type DocumentRow = typeof partnerIdentityDocuments.$inferSelect;

export type IdentityDocumentScanClaim =
  | { state: "claimed"; document: DocumentRow }
  | {
      state: "not_found" | "stale_message" | "already_finished" | "busy" | "exhausted";
    };

function documentDTO(row: DocumentRow): IdentityDocumentDTO {
  return {
    id: row.id,
    side: row.side,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    scanStatus: row.scanStatus,
    scanAttempts: row.scanAttempts,
    scanRetryable:
      row.scanStatus === "error" &&
      row.scanAttempts < env.KYC_SCAN_MAX_ATTEMPTS,
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
        scanStatus: "pending",
        cleanStorageKey: null,
        cleanContentType: null,
        cleanSizeBytes: null,
        cleanSha256: null,
        scanAttempts: 0,
        scanStartedAt: null,
        scanCompletedAt: null,
        scanEngine: null,
        scanResult: null,
        lastScanError: null,
        uploadedAt: new Date(),
      },
    })
    .returning();
  if (!document) throw new Error("Enregistrement du document impossible.");
  return {
    document,
    previousStorageKey: previous?.storageKey ?? null,
    previousCleanStorageKey: previous?.cleanStorageKey ?? null,
  };
}

export async function claimIdentityDocumentForScan(input: {
  documentId: string;
  expectedSha256: string;
  maxAttempts: number;
  staleBefore: Date;
}): Promise<IdentityDocumentScanClaim> {
  const now = new Date();
  const [document] = await db
    .update(partnerIdentityDocuments)
    .set({
      scanStatus: "processing",
      scanAttempts: sql`${partnerIdentityDocuments.scanAttempts} + 1`,
      scanStartedAt: now,
      scanCompletedAt: null,
      scanEngine: null,
      scanResult: null,
      lastScanError: null,
    })
    .where(
      and(
        eq(partnerIdentityDocuments.id, input.documentId),
        eq(partnerIdentityDocuments.sha256, input.expectedSha256),
        lt(partnerIdentityDocuments.scanAttempts, input.maxAttempts),
        or(
          eq(partnerIdentityDocuments.scanStatus, "pending"),
          eq(partnerIdentityDocuments.scanStatus, "error"),
          and(
            eq(partnerIdentityDocuments.scanStatus, "processing"),
            lt(partnerIdentityDocuments.scanStartedAt, input.staleBefore),
          ),
        ),
      ),
    )
    .returning();

  if (document) return { state: "claimed", document };

  const current = await db.query.partnerIdentityDocuments.findFirst({
    where: eq(partnerIdentityDocuments.id, input.documentId),
    columns: {
      sha256: true,
      scanStatus: true,
      scanAttempts: true,
    },
  });
  if (!current) return { state: "not_found" };
  if (current.sha256 !== input.expectedSha256) {
    return { state: "stale_message" };
  }
  if (current.scanStatus === "clean" || current.scanStatus === "rejected") {
    return { state: "already_finished" };
  }
  if (current.scanAttempts >= input.maxAttempts) {
    return { state: "exhausted" };
  }
  return { state: "busy" };
}

export async function markIdentityDocumentScanClean(input: {
  documentId: string;
  storageKey: string;
  cleanStorageKey: string;
  cleanContentType: "image/jpeg" | "image/png" | "application/pdf";
  cleanSizeBytes: number;
  cleanSha256: string;
  engine: string;
}) {
  const [updated] = await db
    .update(partnerIdentityDocuments)
    .set({
      scanStatus: "clean",
      cleanStorageKey: input.cleanStorageKey,
      cleanContentType: input.cleanContentType,
      cleanSizeBytes: input.cleanSizeBytes,
      cleanSha256: input.cleanSha256,
      scanCompletedAt: new Date(),
      scanEngine: input.engine.slice(0, 100),
      scanResult: "clean",
      lastScanError: null,
    })
    .where(
      and(
        eq(partnerIdentityDocuments.id, input.documentId),
        eq(partnerIdentityDocuments.storageKey, input.storageKey),
        eq(partnerIdentityDocuments.scanStatus, "processing"),
      ),
    )
    .returning({ id: partnerIdentityDocuments.id });
  return Boolean(updated);
}

export async function markIdentityDocumentScanRejected(input: {
  documentId: string;
  storageKey: string;
  engine: string;
  result: string;
}) {
  const [updated] = await db
    .update(partnerIdentityDocuments)
    .set({
      scanStatus: "rejected",
      scanCompletedAt: new Date(),
      scanEngine: input.engine.slice(0, 100),
      scanResult: input.result.slice(0, 255),
      lastScanError: null,
    })
    .where(
      and(
        eq(partnerIdentityDocuments.id, input.documentId),
        eq(partnerIdentityDocuments.storageKey, input.storageKey),
        eq(partnerIdentityDocuments.scanStatus, "processing"),
      ),
    )
    .returning({ id: partnerIdentityDocuments.id });
  return Boolean(updated);
}

export async function markIdentityDocumentScanError(input: {
  documentId: string;
  storageKey: string;
  error: string;
}) {
  const [updated] = await db
    .update(partnerIdentityDocuments)
    .set({
      scanStatus: "error",
      scanCompletedAt: new Date(),
      scanResult: "scan_error",
      lastScanError: input.error.slice(0, 2_000),
      cleanStorageKey: null,
      cleanContentType: null,
      cleanSizeBytes: null,
      cleanSha256: null,
    })
    .where(
      and(
        eq(partnerIdentityDocuments.id, input.documentId),
        eq(partnerIdentityDocuments.storageKey, input.storageKey),
        eq(partnerIdentityDocuments.scanStatus, "processing"),
      ),
    )
    .returning({ id: partnerIdentityDocuments.id });
  return Boolean(updated);
}

export async function markIdentityDocumentQueueError(input: {
  documentId: string;
  expectedSha256: string;
  error: string;
}) {
  await db
    .update(partnerIdentityDocuments)
    .set({
      scanStatus: "error",
      scanAttempts: env.KYC_SCAN_MAX_ATTEMPTS,
      scanCompletedAt: new Date(),
      scanResult: "queue_error",
      lastScanError: input.error.slice(0, 2_000),
    })
    .where(
      and(
        eq(partnerIdentityDocuments.id, input.documentId),
        eq(partnerIdentityDocuments.sha256, input.expectedSha256),
        eq(partnerIdentityDocuments.scanStatus, "pending"),
      ),
    );
}

export async function listPartnerDocumentsAwaitingScan(input: {
  partnerAccountId: string;
  maxAttempts: number;
  staleBefore: Date;
}) {
  return db
    .select({
      id: partnerIdentityDocuments.id,
      sha256: partnerIdentityDocuments.sha256,
      storageKey: partnerIdentityDocuments.storageKey,
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
        eq(
          partnerIdentityVerifications.partnerAccountId,
          input.partnerAccountId,
        ),
        lt(partnerIdentityDocuments.scanAttempts, input.maxAttempts),
        or(
          eq(partnerIdentityDocuments.scanStatus, "pending"),
          eq(partnerIdentityDocuments.scanStatus, "error"),
          and(
            eq(partnerIdentityDocuments.scanStatus, "processing"),
            lt(partnerIdentityDocuments.scanStartedAt, input.staleBefore),
          ),
        ),
      ),
    );
}

export async function getDocumentForPartner(
  documentId: string,
  partnerAccountId: string,
) {
  const [row] = await db
    .select({
      id: partnerIdentityDocuments.id,
      cleanStorageKey: partnerIdentityDocuments.cleanStorageKey,
      cleanContentType: partnerIdentityDocuments.cleanContentType,
      scanStatus: partnerIdentityDocuments.scanStatus,
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
    columns: {
      id: true,
      cleanStorageKey: true,
      cleanContentType: true,
      scanStatus: true,
    },
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
