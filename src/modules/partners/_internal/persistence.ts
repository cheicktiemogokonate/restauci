import "server-only";

import {
  and,
  count,
  desc,
  eq,
  gt,
  ilike,
  isNull,
  lte,
  or,
} from "drizzle-orm";
import { batchRead, db } from "@/infrastructure/db";
import {
  partnerAccounts,
  subscriptionPeriods,
  subscriptionPlans,
  users,
} from "@/infrastructure/db/schema";
import type { DbExecutor } from "@/infrastructure/db/transaction";
import { escapeLikePattern } from "@/infrastructure/db/like";
import { withDatabaseReadRetry } from "@/infrastructure/db/read-retry";
import type {
  AdminPartnerOwnerListInput,
  ChoosePartnerActivityInput,
  PartnerAccountDTO,
} from "../contracts";
import { PartnerAccountDomainError } from "../model";

function toPartnerAccountDTO(
  account: typeof partnerAccounts.$inferSelect,
): PartnerAccountDTO {
  return {
    id: account.id,
    userId: account.userId,
    activityType: account.activityType,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

export async function getPartnerAccountRecordByUserId(
  userId: string,
  executor: DbExecutor = db,
) {
  const account = await executor.query.partnerAccounts.findFirst({
    where: eq(partnerAccounts.userId, userId),
  });
  return account ? toPartnerAccountDTO(account) : null;
}

export async function getPartnerAccountRecordById(
  partnerAccountId: string,
  executor: DbExecutor = db,
) {
  const account = await executor.query.partnerAccounts.findFirst({
    where: eq(partnerAccounts.id, partnerAccountId),
  });
  return account ? toPartnerAccountDTO(account) : null;
}

export async function choosePartnerActivityRecord(
  userId: string,
  activityType: ChoosePartnerActivityInput,
) {
  const existing = await getPartnerAccountRecordByUserId(userId);
  if (existing) {
    if (existing.activityType !== activityType) {
      throw new PartnerAccountDomainError(
        "ACTIVITY_ALREADY_SELECTED",
        "L’activité de ce compte partenaire a déjà été choisie.",
      );
    }
    return existing;
  }

  await db
    .insert(partnerAccounts)
    .values({ userId, activityType })
    .onConflictDoNothing({ target: partnerAccounts.userId });

  const created = await getPartnerAccountRecordByUserId(userId);
  if (!created) {
    throw new PartnerAccountDomainError(
      "ACCOUNT_CREATION_FAILED",
      "La configuration du compte partenaire a échoué.",
    );
  }
  if (created.activityType !== activityType) {
    throw new PartnerAccountDomainError(
      "ACTIVITY_ALREADY_SELECTED",
      "L’activité de ce compte partenaire a déjà été choisie.",
    );
  }
  return created;
}

export async function listAdminPartnerOwnerRecords(
  input: AdminPartnerOwnerListInput,
) {
  const normalizedSearch = input.search?.trim();
  const searchPattern = normalizedSearch
    ? `%${escapeLikePattern(normalizedSearch)}%`
    : null;
  const where = and(
    eq(users.role, "partner"),
    searchPattern
      ? or(
          ilike(users.nom, searchPattern),
          ilike(users.email, searchPattern),
          ilike(users.telephone, searchPattern),
        )
      : undefined,
  );
  const now = new Date();
  const activePeriods = db
    .select({
      partnerAccountId: subscriptionPeriods.partnerAccountId,
      planCode: subscriptionPeriods.planCode,
      status: subscriptionPeriods.statut,
      expiresAt: subscriptionPeriods.dateEcheance,
    })
    .from(subscriptionPeriods)
    .where(
      and(
        eq(subscriptionPeriods.statut, "active"),
        lte(subscriptionPeriods.dateDebut, now),
        or(
          isNull(subscriptionPeriods.dateEcheance),
          gt(subscriptionPeriods.dateEcheance, now),
        ),
      ),
    )
    .as("active_admin_partner_periods");
  const offset = (input.page - 1) * input.limit;

  const [rows, totalRows] = await withDatabaseReadRetry(() =>
    batchRead([
      db
      .select({
        userId: users.id,
        name: users.nom,
        email: users.email,
        phone: users.telephone,
        suspended: users.suspendu,
        createdAt: users.createdAt,
        partnerAccountId: partnerAccounts.id,
        activityType: partnerAccounts.activityType,
        planCode: activePeriods.planCode,
        planName: subscriptionPlans.nom,
        subscriptionStatus: activePeriods.status,
        expiresAt: activePeriods.expiresAt,
      })
      .from(users)
      .leftJoin(partnerAccounts, eq(partnerAccounts.userId, users.id))
      .leftJoin(
        activePeriods,
        eq(activePeriods.partnerAccountId, partnerAccounts.id),
      )
      .leftJoin(
        subscriptionPlans,
        eq(subscriptionPlans.code, activePeriods.planCode),
      )
      .where(where)
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(input.limit)
        .offset(offset),
      db.select({ total: count() }).from(users).where(where),
    ]),
  );
  const total = Number(totalRows[0]?.total ?? 0);

  return {
    items: rows.map((row) => ({
      userId: row.userId,
      name: row.name,
      email: row.email,
      phone: row.phone,
      suspended: row.suspended,
      createdAt: row.createdAt.toISOString(),
      partnerAccount:
        row.partnerAccountId && row.activityType
          ? { id: row.partnerAccountId, activityType: row.activityType }
          : null,
      subscription:
        row.planCode && row.planName && row.subscriptionStatus
          ? {
              planCode: row.planCode,
              planName: row.planName,
              status: row.subscriptionStatus,
              expiresAt: row.expiresAt?.toISOString() ?? null,
            }
          : null,
    })),
    total,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
  };
}
