import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { partnerAccounts } from "@/lib/db/schema";
import type { ChoosePartnerActivityInput } from "../contracts";
import { PartnerAccountDomainError } from "../model";

export function getPartnerAccountRecordByUserId(userId: string) {
  return db.query.partnerAccounts.findFirst({
    where: eq(partnerAccounts.userId, userId),
  });
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
