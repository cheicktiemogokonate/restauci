import { db } from "./db";
import { 
  subscriptionPlans, 
  subscriptionPeriods
} from "./db/schema";
import { eq, and, gt, lte, or, desc, isNull } from "drizzle-orm";
import { SubscriptionPlan, SubscriptionPeriod } from "./db/types";

/**
 * Récupère le plan d'abonnement actif pour un restaurant.
 * Un restaurant a toujours un plan actif (Découverte par défaut s'il n'y a pas d'historique).
 */
export async function getEffectivePlan(restaurantId: string): Promise<{
  plan: SubscriptionPlan;
  period: SubscriptionPeriod | null;
}> {
  const now = new Date();

  // On cherche la période active en cours
  // "active" signifie: statut = active, date_debut <= now, (date_echeance == null OR date_echeance > now)
  const activePeriod = await db.query.subscriptionPeriods.findFirst({
    where: and(
      eq(subscriptionPeriods.restaurantId, restaurantId),
      eq(subscriptionPeriods.statut, "active"),
      lte(subscriptionPeriods.dateDebut, now),
      or(
        isNull(subscriptionPeriods.dateEcheance),
        gt(subscriptionPeriods.dateEcheance, now)
      )
    ),
    orderBy: [desc(subscriptionPeriods.dateDebut)], // au cas où, on prend la plus récente
  });

  if (activePeriod) {
    const plan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.code, activePeriod.planCode)
    });

    if (plan) {
      return { plan, period: activePeriod };
    }
  }

  // Fallback: Si aucune période active n'est trouvée, c'est le plan "decouverte" par défaut.
  const defaultPlan = await db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.code, "decouverte")
  });

  if (!defaultPlan) {
    throw new Error("Catalogue des plans corrompu: plan 'decouverte' introuvable.");
  }

  return { plan: defaultPlan, period: null };
}

/**
 * Récupère le taux de commission en vigueur (points de base) pour une commande.
 * Si une période est active, on utilise le taux figé `tauxCommissionBpsFige` (pour protéger l'historique en cas de changement de catalogue).
 */
export async function getCommissionRateBps(restaurantId: string): Promise<number> {
  const { plan, period } = await getEffectivePlan(restaurantId);
  
  if (period) {
    return period.tauxCommissionBpsFige;
  }
  
  return plan.tauxCommissionBps;
}

/**
 * Vérifie si le restaurant a atteint une limite de son abonnement actif
 */
export async function checkPlanLimits(
  restaurantId: string, 
  metric: "plats" | "categories", 
  currentCount: number
): Promise<boolean> {
  const { plan } = await getEffectivePlan(restaurantId);
  
  const limit = metric === "plats" ? plan.maxPlats : plan.maxCategories;
  
  // Si null, c'est illimité
  if (limit === null) return true;
  
  return currentCount < limit;
}
