import "server-only";

import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { partnerAccounts } from "@/lib/db/schema";
import type { ActivityType, PartnerAccount } from "@/lib/db/types";
import { eq } from "drizzle-orm";
import { assertPartnerAccess } from "@/lib/auth/partner-account-policy";

export { PartnerAuthorizationError } from "@/lib/auth/partner-account-policy";

export async function requirePartnerAccount(): Promise<PartnerAccount> {
  const identity = await getCurrentUser();
  if (!identity) return assertPartnerAccess(null, null);

  const partnerAccount = await db.query.partnerAccounts.findFirst({
    where: eq(partnerAccounts.userId, identity.userId),
  });
  return assertPartnerAccess(identity, partnerAccount ?? null);
}

export async function requirePartnerActivity(
  activityType: ActivityType,
): Promise<PartnerAccount> {
  const identity = await getCurrentUser();
  if (!identity) return assertPartnerAccess(null, null, activityType);

  const partnerAccount = await db.query.partnerAccounts.findFirst({
    where: eq(partnerAccounts.userId, identity.userId),
  });
  return assertPartnerAccess(identity, partnerAccount ?? null, activityType);
}
