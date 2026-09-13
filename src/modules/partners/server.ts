import "server-only";

import { getCurrentUser } from "@/modules/auth/server";
import type { DbExecutor } from "@/infrastructure/db/transaction";
import {
  adminPartnerOwnerListSchema,
  partnerActivitySchema,
  type AdminPartnerOwnerListInput,
  type ChoosePartnerActivityInput,
} from "./contracts";
import {
  choosePartnerActivityRecord,
  getPartnerAccountRecordById,
  getPartnerAccountRecordByUserId,
  listAdminPartnerOwnerRecords,
} from "./_internal/persistence";
import {
  reactivatePartnerOwnerRecord,
  suspendPartnerOwnerRecord,
} from "./_internal/administration";
import {
  assertPartnerAccess,
  PartnerAccountDomainError,
  PartnerAuthorizationError,
  type PartnerActivityType,
} from "./model";

export { PartnerAuthorizationError } from "./model";

export function getPartnerAccountByUserId(userId: string) {
  return getPartnerAccountRecordByUserId(userId);
}

export function getPartnerAccountById(
  partnerAccountId: string,
  options: { executor?: DbExecutor } = {},
) {
  return getPartnerAccountRecordById(
    partnerAccountId,
    options.executor,
  );
}

export async function getOptionalCurrentPartnerAccount() {
  const identity = await getCurrentUser();
  if (!identity || identity.role !== "partner") return null;
  return getPartnerAccountRecordByUserId(identity.userId);
}

export async function requirePartnerAccount() {
  return (await requireCurrentPartnerContext()).partnerAccount;
}

export async function requireCurrentPartnerContext(
  expectedActivity?: PartnerActivityType,
) {
  const identity = await getCurrentUser();
  const account = identity
    ? await getPartnerAccountRecordByUserId(identity.userId)
    : null;
  return {
    identity: identity!,
    partnerAccount: assertPartnerAccess(
      identity,
      account,
      expectedActivity,
    ),
  };
}

export async function requirePartnerActivity(
  activityType: PartnerActivityType,
) {
  return (await requireCurrentPartnerContext(activityType)).partnerAccount;
}

export function choosePartnerActivity(
  userId: string,
  activityType: ChoosePartnerActivityInput,
) {
  return choosePartnerActivityRecord(
    userId,
    partnerActivitySchema.parse(activityType),
  );
}

export async function chooseCurrentPartnerActivity(
  activityType: ChoosePartnerActivityInput,
) {
  const identity = await getCurrentUser();
  if (!identity) {
    throw new PartnerAuthorizationError(
      "Session partenaire requise",
      "unauthenticated",
    );
  }
  if (identity.role !== "partner") {
    throw new PartnerAuthorizationError(
      "Accès réservé aux partenaires",
      "not_partner",
    );
  }
  return choosePartnerActivityRecord(
    identity.userId,
    partnerActivitySchema.parse(activityType),
  );
}

export async function requirePartnerAccountActivityById(
  partnerAccountId: string,
  activityType: PartnerActivityType,
  options: { executor?: DbExecutor } = {},
) {
  const account = await getPartnerAccountRecordById(
    partnerAccountId,
    options.executor,
  );
  if (!account) {
    throw new PartnerAccountDomainError(
      "ACCOUNT_NOT_FOUND",
      "Compte partenaire introuvable.",
    );
  }
  if (account.activityType !== activityType) {
    throw new PartnerAccountDomainError(
      "ACCOUNT_ACTIVITY_MISMATCH",
      `Ce compte partenaire n’est pas rattaché à l’activité ${activityType}.`,
    );
  }
  return account;
}

export function listAdminPartnerOwners(input: AdminPartnerOwnerListInput) {
  return listAdminPartnerOwnerRecords(adminPartnerOwnerListSchema.parse(input));
}

export function suspendPartnerOwner(
  userId: string,
  adminId: string,
  reason: string,
) {
  return suspendPartnerOwnerRecord(userId, adminId, reason);
}

export function reactivatePartnerOwner(userId: string, adminId: string) {
  return reactivatePartnerOwnerRecord(userId, adminId);
}
