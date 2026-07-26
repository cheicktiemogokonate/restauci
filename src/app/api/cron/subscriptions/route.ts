import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { 
  subscriptionPeriods, 
  subscriptionPlans,
  auditLog,
  notifications,
  restaurants,
  users
} from "@/lib/db/schema";
import { lte, eq, and, isNotNull } from "drizzle-orm";

// Secret pour protéger la route (ex: CRON_SECRET dans Vercel/Render)
const CRON_SECRET = process.env.CRON_SECRET || "dev-cron-secret";

export async function GET(request: Request) {
  // Vérification de sécurité simple via header Authorization
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
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
      await db.transaction(async (tx) => {
        // a) Marquer la période comme expirée
        await tx.update(subscriptionPeriods)
          .set({ statut: "expiree" })
          .where(eq(subscriptionPeriods.id, period.id));

        // b) Créer une notification
        const restaurant = await tx.query.restaurants.findFirst({
          where: eq(restaurants.id, period.restaurantId),
          columns: { userId: true, nom: true }
        });

        if (restaurant) {
         await tx.insert(notifications).values({
           userId: restaurant.userId,
           type: "abonnement_expire",
           titre: "Abonnement expiré",
            message: `Votre abonnement ${period.planCode} a expiré. Vous avez été rétrogradé à l'offre Découverte.`,
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
            await tx.insert(auditLog).values({
              adminId: superAdmin.id,
              action: "abonnement_expire",
              ressourceType: "restaurant",
              ressourceId: period.restaurantId,
              details: {
                periodId: period.id,
                planCode: period.planCode,
                message: "Rétrogradation automatique par cron"
              }
            });
          }
        }

        // d) Créer la nouvelle période 'decouverte' pour assurer la continuité
        //    — uniquement s'il n'en existe pas déjà une active (sinon on se
        //    retrouverait avec deux périodes Découverte actives simultanément).
        const decouverteActive = await tx.query.subscriptionPeriods.findFirst({
          where: and(
            eq(subscriptionPeriods.restaurantId, period.restaurantId),
            eq(subscriptionPeriods.statut, "active"),
            eq(subscriptionPeriods.planCode, "decouverte")
          ),
        });

        if (decouverteActive) {
          // Une période Découverte est déjà active, on ne crée pas de doublon.
          return;
        }

        const decouvertePlan = await tx.query.subscriptionPlans.findFirst({
          where: eq(subscriptionPlans.code, "decouverte")
        });

        if (decouvertePlan) {
          await tx.insert(subscriptionPeriods).values({
            restaurantId: period.restaurantId,
            planCode: "decouverte",
            tauxCommissionBpsFige: decouvertePlan.tauxCommissionBps,
            statut: "active",
          });
        }
      });

      expiredCount++;
    }

    return NextResponse.json({ 
      success: true, 
      processed: expiredPeriods.length, 
      expired: expiredCount 
    });

  } catch (error: any) {
    console.error("[CRON SUBSCRIPTIONS]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
