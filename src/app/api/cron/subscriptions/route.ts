import { NextResponse } from "next/server";
import { transactionalDb as db } from "@/lib/db/transaction";
import { hasValidCronAuthorization } from "@/lib/cron-auth";
import { 
  subscriptionPeriods, 
  partnerAccounts,
  users
} from "@/lib/db/schema";
import { lte, eq, and, isNotNull } from "drizzle-orm";
import { persistAuditLog } from "@/lib/audit";
import { persistNotification } from "@/lib/notifications";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 32) {
    console.error("[CRON SUBSCRIPTIONS] CRON_SECRET manquant ou trop court");
    return new NextResponse("Cron unavailable", { status: 503 });
  }

  if (!hasValidCronAuthorization(request.headers.get("authorization"), cronSecret)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const now = new Date();

    // 1. Trouver toutes les périodes actives dont la date d'échéance est passée
    const expiredPeriods = await db.query.subscriptionPeriods.findMany({
      where: and(
        eq(subscriptionPeriods.statut, "active"),
        isNotNull(subscriptionPeriods.dateEcheance),
        lte(subscriptionPeriods.dateEcheance, now)
      ),
    });

    let expiredCount = 0;

    for (const period of expiredPeriods) {
      const processed = await db.transaction(async (tx) => {
        // Le changement d'état conditionnel rend le traitement rejouable et
        // empêche deux exécutions concurrentes de produire deux notifications.
        const [expiredPeriod] = await tx.update(subscriptionPeriods)
          .set({
            statut: "expiree",
            endedAt: period.dateEcheance,
            endReason: "expiration_naturelle",
          })
          .where(and(
            eq(subscriptionPeriods.id, period.id),
            eq(subscriptionPeriods.statut, "active"),
            isNotNull(subscriptionPeriods.dateEcheance),
            lte(subscriptionPeriods.dateEcheance, now),
          ))
          .returning({ id: subscriptionPeriods.id });

        if (!expiredPeriod) return false;

        // b) Créer une notification
        const partnerAccount = await tx.query.partnerAccounts.findFirst({
          where: eq(partnerAccounts.id, period.partnerAccountId),
          columns: { userId: true },
          with: { restaurant: { columns: { nom: true } } },
        });

        if (partnerAccount) {
         await persistNotification(tx, {
           userId: partnerAccount.userId,
           type: "abonnement_expire",
           titre: "Abonnement expiré",
            message: `Votre abonnement ${period.planCode} a expiré. L'offre Découverte s'applique désormais automatiquement.`,
            lienType: "abonnement",
          });

          // c) Créer une entrée dans auditLog
          // L'action est système, donc pas de adminId (ou un admin système par défaut si requis)
          // Actuellement adminId est notNull() dans le schéma, il faudrait soit le rendre nullable 
          // soit utiliser un compte admin "Système". Pour l'instant, on ignore le log d'audit s'il n'y a pas d'admin,
          // ou on trouve un superadmin.
          const superAdmin = await tx.query.users.findFirst({
            where: eq(users.role, "admin")
          });

          if (superAdmin) {
            await persistAuditLog(tx, {
              adminId: superAdmin.id,
              action: "abonnement_expire",
              ressourceType: "partner_account",
              ressourceId: period.partnerAccountId,
              details: {
                periodId: period.id,
                planCode: period.planCode,
                message: "Rétrogradation automatique par cron"
              }
            });
          }
        }

        return true;
      });

      if (processed) expiredCount++;
    }

    return NextResponse.json({ 
      success: true, 
      processed: expiredPeriods.length, 
      expired: expiredCount 
    });

  } catch (error: unknown) {
    console.error("[CRON SUBSCRIPTIONS]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
