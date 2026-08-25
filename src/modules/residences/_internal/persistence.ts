import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { persistAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  partnerAccounts,
  residenceImages,
  residences,
  users,
} from "@/lib/db/schema";
import {
  transactionalDb,
  type DbExecutor,
  type TransactionExecutor,
} from "@/lib/db/transaction";
import { persistNotification } from "@/lib/notifications";
import type {
  AdminResidenceDetailsDTO,
  AdminResidenceListItemDTO,
  ListAdminResidencesInput,
  PartnerResidenceDTO,
  SaveResidenceInput,
} from "../contracts";
import {
  getResidenceModerationStatus,
  ResidenceDomainError,
  residenceSlugBase,
} from "../model";

type ResidenceRow = typeof residences.$inferSelect;
type ResidenceImageRow = typeof residenceImages.$inferSelect;

function toPartnerDTO(
  row: ResidenceRow & { images: ResidenceImageRow[] },
): PartnerResidenceDTO {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    pricePerNightFcfa: row.pricePerNightFcfa,
    maxGuests: row.maxGuests,
    address: row.address,
    city: row.city,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    publicationIntent: row.publicationIntent,
    publicationEnabledAt: row.publicationEnabledAt?.toISOString() ?? null,
    moderationStatus: getResidenceModerationStatus(row),
    motifRejet: row.motifRejet,
    motifSuspension: row.motifSuspension,
    validatedAt: row.validatedAt?.toISOString() ?? null,
    firstPublishedAt: row.firstPublishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    photos: row.images.map((image) => ({
      id: image.id,
      url: image.url,
      altText: image.altText,
      sortOrder: image.sortOrder,
    })),
  };
}

export async function markResidenceFirstPublishedRecords(
  partnerAccountId: string,
  residenceIds: string[],
  publishedAt: Date,
  executor: DbExecutor = db,
) {
  if (residenceIds.length === 0) return;
  await executor
    .update(residences)
    .set({ firstPublishedAt: publishedAt, updatedAt: publishedAt })
    .where(
      and(
        eq(residences.partnerAccountId, partnerAccountId),
        inArray(residences.id, residenceIds),
        isNull(residences.firstPublishedAt),
      ),
    );
}

async function assertResidencePartner(
  partnerAccountId: string,
  executor: DbExecutor = db,
) {
  const account = await executor.query.partnerAccounts.findFirst({
    where: and(
      eq(partnerAccounts.id, partnerAccountId),
      eq(partnerAccounts.activityType, "residence"),
    ),
  });
  if (!account) {
    throw new ResidenceDomainError(
      "RESIDENCE_ACTIVITY_REQUIRED",
      "Ce compte partenaire n’est pas rattaché à l’activité Résidence.",
    );
  }
}

export async function listPartnerResidenceRecords(
  partnerAccountId: string,
  executor: DbExecutor = db,
) {
  await assertResidencePartner(partnerAccountId, executor);
  const rows = await executor.query.residences.findMany({
    where: and(
      eq(residences.partnerAccountId, partnerAccountId),
      isNull(residences.archivedAt),
    ),
    with: { images: { orderBy: [asc(residenceImages.sortOrder)] } },
    orderBy: [desc(residences.updatedAt), desc(residences.id)],
  });
  return rows.map(toPartnerDTO);
}

export async function listResidencePublicationPartnerIdsRecords() {
  const rows = await db
    .selectDistinct({ partnerAccountId: residences.partnerAccountId })
    .from(residences)
    .where(
      and(
        isNotNull(residences.publicationEnabledAt),
        isNull(residences.archivedAt),
      ),
    );
  return rows.map((row) => row.partnerAccountId);
}

export async function getResidencePartnerIdBySlugRecord(slug: string) {
  const row = await db.query.residences.findFirst({
    where: and(eq(residences.slug, slug), isNull(residences.archivedAt)),
    columns: { partnerAccountId: true },
  });
  return row?.partnerAccountId ?? null;
}

export async function getPartnerResidenceRecord(
  partnerAccountId: string,
  residenceId: string,
  executor: DbExecutor = db,
) {
  await assertResidencePartner(partnerAccountId, executor);
  const row = await executor.query.residences.findFirst({
    where: and(
      eq(residences.id, residenceId),
      eq(residences.partnerAccountId, partnerAccountId),
      isNull(residences.archivedAt),
    ),
    with: { images: { orderBy: [asc(residenceImages.sortOrder)] } },
  });
  return row ? toPartnerDTO(row) : null;
}

export async function createResidenceRecord(
  partnerAccountId: string,
  input: SaveResidenceInput,
) {
  await assertResidencePartner(partnerAccountId);
  const id = crypto.randomUUID();
  const slug = `${residenceSlugBase(input.title)}-${id.slice(0, 8)}`;
  await transactionalDb.transaction(async (tx) => {
    await tx.insert(residences).values({
      id,
      partnerAccountId,
      slug,
      title: input.title,
      description: input.description,
      pricePerNightFcfa: input.pricePerNightFcfa,
      maxGuests: input.maxGuests,
      address: input.address,
      city: input.city,
      country: input.country,
      latitude: input.latitude,
      longitude: input.longitude,
      publicationIntent: input.publicationIntent,
    });
    if (input.photos.length > 0) {
      await tx.insert(residenceImages).values(
        input.photos.map((photo, index) => ({
          residenceId: id,
          url: photo.url,
          altText: photo.altText,
          sortOrder: index,
        })),
      );
    }
  });
  return getPartnerResidenceRecord(partnerAccountId, id);
}

export async function updateResidenceRecord(
  partnerAccountId: string,
  residenceId: string,
  input: SaveResidenceInput,
) {
  await assertResidencePartner(partnerAccountId);
  await transactionalDb.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM ${residences} WHERE id = ${residenceId} FOR UPDATE`,
    );
    const current = await tx.query.residences.findFirst({
      where: and(
        eq(residences.id, residenceId),
        eq(residences.partnerAccountId, partnerAccountId),
        isNull(residences.archivedAt),
      ),
    });
    if (!current) {
      throw new ResidenceDomainError(
        "RESIDENCE_NOT_FOUND",
        "Résidence introuvable.",
      );
    }
    if (current.suspendu) {
      throw new ResidenceDomainError(
        "RESIDENCE_NOT_EDITABLE",
        "Une résidence suspendue doit d’abord être réactivée par un administrateur.",
      );
    }
    await tx
      .update(residences)
      .set({
        title: input.title,
        description: input.description,
        pricePerNightFcfa: input.pricePerNightFcfa,
        maxGuests: input.maxGuests,
        address: input.address,
        city: input.city,
        country: input.country,
        latitude: input.latitude,
        longitude: input.longitude,
        publicationIntent: input.publicationIntent,
        publicationEnabledAt: null,
        actif: false,
        motifRejet: null,
        validatedByAdminId: null,
        validatedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(residences.id, residenceId));
    await tx
      .delete(residenceImages)
      .where(eq(residenceImages.residenceId, residenceId));
    if (input.photos.length > 0) {
      await tx.insert(residenceImages).values(
        input.photos.map((photo, index) => ({
          residenceId,
          url: photo.url,
          altText: photo.altText,
          sortOrder: index,
        })),
      );
    }
  });
  return getPartnerResidenceRecord(partnerAccountId, residenceId);
}

export async function withPartnerResidencePublicationTransaction<T>(
  partnerAccountId: string,
  residenceId: string,
  operation: (context: {
    executor: TransactionExecutor;
    current: PartnerResidenceDTO;
    residences: PartnerResidenceDTO[];
  }) => Promise<T>,
) {
  return transactionalDb.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM ${partnerAccounts} WHERE id = ${partnerAccountId} FOR UPDATE`,
    );
    await assertResidencePartner(partnerAccountId, tx);
    await tx.execute(
      sql`SELECT id FROM ${residences} WHERE id = ${residenceId} FOR UPDATE`,
    );
    const partnerResidences = await listPartnerResidenceRecords(
      partnerAccountId,
      tx,
    );
    const current = partnerResidences.find(
      (residence) => residence.id === residenceId,
    );
    if (!current) {
      throw new ResidenceDomainError(
        "RESIDENCE_NOT_FOUND",
        "Résidence introuvable.",
      );
    }
    return operation({ executor: tx, current, residences: partnerResidences });
  });
}

export async function setResidencePublicationEnabledRecord(
  executor: TransactionExecutor,
  partnerAccountId: string,
  residenceId: string,
  publicationEnabledAt: Date | null,
  firstPublishedAt?: Date,
) {
  const now = new Date();
  await executor
    .update(residences)
    .set({
      publicationEnabledAt,
      ...(firstPublishedAt ? { firstPublishedAt } : {}),
      updatedAt: now,
    })
    .where(
      and(
        eq(residences.id, residenceId),
        eq(residences.partnerAccountId, partnerAccountId),
        isNull(residences.archivedAt),
      ),
    );
}

function adminStatusCondition(status: ListAdminResidencesInput["status"]) {
  switch (status) {
    case "draft":
      return and(
        eq(residences.publicationIntent, false),
        eq(residences.actif, false),
        eq(residences.suspendu, false),
        isNull(residences.motifRejet),
      );
    case "pending":
      return and(
        eq(residences.publicationIntent, true),
        eq(residences.actif, false),
        eq(residences.suspendu, false),
        isNull(residences.motifRejet),
      );
    case "approved":
      return and(eq(residences.actif, true), eq(residences.suspendu, false));
    case "rejected":
      return isNotNull(residences.motifRejet);
    case "suspended":
      return eq(residences.suspendu, true);
    default:
      return undefined;
  }
}

export async function listAdminResidenceRecords(
  input: ListAdminResidencesInput,
) {
  const filters = [isNull(residences.archivedAt)];
  const statusCondition = adminStatusCondition(input.status);
  if (statusCondition) filters.push(statusCondition);
  if (input.search) {
    const pattern = `%${input.search}%`;
    filters.push(
      or(
        ilike(residences.title, pattern),
        ilike(residences.city, pattern),
        ilike(users.nom, pattern),
        ilike(users.email, pattern),
      )!,
    );
  }
  const where = and(...filters);
  const offset = (input.page - 1) * input.limit;
  const base = db
    .select({
      id: residences.id,
      title: residences.title,
      city: residences.city,
      accountName: users.nom,
      accountEmail: users.email,
      publicationIntent: residences.publicationIntent,
      actif: residences.actif,
      suspendu: residences.suspendu,
      motifRejet: residences.motifRejet,
      createdAt: residences.createdAt,
      updatedAt: residences.updatedAt,
    })
    .from(residences)
    .innerJoin(
      partnerAccounts,
      eq(partnerAccounts.id, residences.partnerAccountId),
    )
    .innerJoin(users, eq(users.id, partnerAccounts.userId));
  const countQuery = db
    .select({ total: count() })
    .from(residences)
    .innerJoin(
      partnerAccounts,
      eq(partnerAccounts.id, residences.partnerAccountId),
    )
    .innerJoin(users, eq(users.id, partnerAccounts.userId));
  const [rows, totals] = await Promise.all([
    base
      .where(where)
      .orderBy(desc(residences.updatedAt), desc(residences.id))
      .limit(input.limit)
      .offset(offset),
    countQuery.where(where),
  ]);
  const items: AdminResidenceListItemDTO[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    city: row.city,
    accountName: row.accountName,
    accountEmail: row.accountEmail,
    publicationIntent: row.publicationIntent,
    moderationStatus: getResidenceModerationStatus(row),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
  const total = totals[0]?.total ?? 0;
  return {
    items,
    total,
    page: input.page,
    totalPages: Math.max(1, Math.ceil(total / input.limit)),
  };
}

export async function getAdminResidenceRecord(
  residenceId: string,
): Promise<AdminResidenceDetailsDTO | null> {
  const row = await db.query.residences.findFirst({
    where: and(eq(residences.id, residenceId), isNull(residences.archivedAt)),
    with: {
      images: { orderBy: [asc(residenceImages.sortOrder)] },
      partnerAccount: { with: { user: true } },
    },
  });
  if (!row) return null;
  return {
    ...toPartnerDTO(row),
    partnerAccountId: row.partnerAccountId,
    accountName: row.partnerAccount.user.nom,
    accountEmail: row.partnerAccount.user.email,
    accountPhone: row.partnerAccount.user.telephone,
    validatedByAdminId: row.validatedByAdminId,
  };
}

async function lockResidenceForAdmin(
  tx: Parameters<Parameters<typeof transactionalDb.transaction>[0]>[0],
  residenceId: string,
) {
  await tx.execute(
    sql`SELECT id FROM ${residences} WHERE id = ${residenceId} FOR UPDATE`,
  );
  return tx.query.residences.findFirst({
    where: and(eq(residences.id, residenceId), isNull(residences.archivedAt)),
    with: { partnerAccount: { with: { user: true } } },
  });
}

export async function approveResidenceRecord(
  adminId: string,
  residenceId: string,
) {
  await transactionalDb.transaction(async (tx) => {
    const current = await lockResidenceForAdmin(tx, residenceId);
    if (!current) {
      throw new ResidenceDomainError("RESIDENCE_NOT_FOUND", "Résidence introuvable.");
    }
    if (
      !current.publicationIntent ||
      current.actif ||
      current.suspendu ||
      current.motifRejet
    ) {
      throw new ResidenceDomainError(
        "RESIDENCE_NOT_REVIEWABLE",
        "Cette résidence n’est pas en attente de validation.",
      );
    }
    const now = new Date();
    await tx
      .update(residences)
      .set({
        actif: true,
        motifRejet: null,
        validatedByAdminId: adminId,
        validatedAt: now,
        updatedAt: now,
      })
      .where(eq(residences.id, residenceId));
    await persistAuditLog(tx, {
      adminId,
      action: "residence_validee",
      ressourceType: "residence",
      ressourceId: residenceId,
      details: { title: current.title },
    });
    await persistNotification(tx, {
      userId: current.partnerAccount.user.id,
      type: "systeme",
      titre: "Résidence validée",
      message: `${current.title} a été validée par l’équipe Toutci.`,
      lienType: "residence",
      lienId: residenceId,
    });
  });
  return getAdminResidenceRecord(residenceId);
}

export async function rejectResidenceRecord(
  adminId: string,
  residenceId: string,
  reason: string,
) {
  await transactionalDb.transaction(async (tx) => {
    const current = await lockResidenceForAdmin(tx, residenceId);
    if (!current) {
      throw new ResidenceDomainError("RESIDENCE_NOT_FOUND", "Résidence introuvable.");
    }
    if (
      !current.publicationIntent ||
      current.actif ||
      current.suspendu ||
      current.motifRejet
    ) {
      throw new ResidenceDomainError(
        "RESIDENCE_NOT_REVIEWABLE",
        "Cette résidence n’est pas en attente de validation.",
      );
    }
    await tx
      .update(residences)
      .set({ motifRejet: reason, updatedAt: new Date() })
      .where(eq(residences.id, residenceId));
    await persistAuditLog(tx, {
      adminId,
      action: "residence_rejetee",
      ressourceType: "residence",
      ressourceId: residenceId,
      details: { reason },
    });
    await persistNotification(tx, {
      userId: current.partnerAccount.user.id,
      type: "systeme",
      titre: "Résidence à corriger",
      message: reason,
      lienType: "residence",
      lienId: residenceId,
    });
  });
  return getAdminResidenceRecord(residenceId);
}

export async function suspendResidenceRecord(
  adminId: string,
  residenceId: string,
  reason: string,
) {
  await transactionalDb.transaction(async (tx) => {
    const current = await lockResidenceForAdmin(tx, residenceId);
    if (!current) {
      throw new ResidenceDomainError("RESIDENCE_NOT_FOUND", "Résidence introuvable.");
    }
    if (!current.actif || current.suspendu) {
      throw new ResidenceDomainError(
        "RESIDENCE_NOT_SUSPENDABLE",
        "Seule une résidence active peut être suspendue.",
      );
    }
    await tx
      .update(residences)
      .set({ suspendu: true, motifSuspension: reason, updatedAt: new Date() })
      .where(eq(residences.id, residenceId));
    await persistAuditLog(tx, {
      adminId,
      action: "residence_suspendue",
      ressourceType: "residence",
      ressourceId: residenceId,
      details: { reason },
    });
    await persistNotification(tx, {
      userId: current.partnerAccount.user.id,
      type: "systeme",
      titre: "Résidence suspendue",
      message: reason,
      lienType: "residence",
      lienId: residenceId,
    });
  });
  return getAdminResidenceRecord(residenceId);
}

export async function reactivateResidenceRecord(
  adminId: string,
  residenceId: string,
) {
  await transactionalDb.transaction(async (tx) => {
    const current = await lockResidenceForAdmin(tx, residenceId);
    if (!current) {
      throw new ResidenceDomainError("RESIDENCE_NOT_FOUND", "Résidence introuvable.");
    }
    if (!current.suspendu) {
      throw new ResidenceDomainError(
        "RESIDENCE_NOT_REACTIVATABLE",
        "Cette résidence n’est pas suspendue.",
      );
    }
    await tx
      .update(residences)
      .set({ suspendu: false, motifSuspension: null, updatedAt: new Date() })
      .where(eq(residences.id, residenceId));
    await persistAuditLog(tx, {
      adminId,
      action: "residence_reactivee",
      ressourceType: "residence",
      ressourceId: residenceId,
    });
    await persistNotification(tx, {
      userId: current.partnerAccount.user.id,
      type: "systeme",
      titre: "Résidence réactivée",
      message: `${current.title} a été réactivée.`,
      lienType: "residence",
      lienId: residenceId,
    });
  });
  return getAdminResidenceRecord(residenceId);
}
