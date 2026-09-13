import { transactionalDb } from "@/infrastructure/db/transaction";
import { eq, and } from "drizzle-orm";
import { users } from "@/infrastructure/db/schema";
import { persistAuditLog } from "@/modules/audit/server";
import { revokeOwnerSessions } from "@/infrastructure/auth/revocation";


export class AdminTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminTransitionError";
  }
}

// ============================================================================
// SUSPENSION UTILISATEURS / CLIENTS
// ============================================================================

export async function suspendPartnerOwnerRecord(
  userId:  string,
  adminId: string,
  motif:   string
) {
  await revokeOwnerSessions("user", userId);
  return transactionalDb.transaction(async (tx) => {
    const [user] = await tx.update(users).set({
        suspendu: true, motifSuspension: motif, suspenduAt: new Date(), updatedAt: new Date(),
      }).where(and(
        eq(users.id, userId), eq(users.role, "partner"), eq(users.suspendu, false),
      )).returning();
    if (!user) throw new AdminTransitionError("Seul un restaurateur actif peut être suspendu.");
    await persistAuditLog(tx, {
      adminId, action: "user_suspendu", ressourceType: "user",
      ressourceId: userId, details: { motif },
    });
    return user;
  });
}

export async function reactivatePartnerOwnerRecord(userId: string, adminId: string) {
  return transactionalDb.transaction(async (tx) => {
    const [user] = await tx.update(users).set({
        suspendu: false, motifSuspension: null, suspenduAt: null, updatedAt: new Date(),
      }).where(and(
        eq(users.id, userId), eq(users.role, "partner"), eq(users.suspendu, true),
      )).returning();
    if (!user) throw new AdminTransitionError("Seul un restaurateur suspendu peut être réactivé.");
    await persistAuditLog(tx, {
      adminId, action: "user_reactive", ressourceType: "user", ressourceId: userId,
    });
    return user;
  });
}
