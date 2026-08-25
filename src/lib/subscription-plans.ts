import { db } from "./db";
import { 
  subscriptionPlans, 
  subscriptionPeriods,
  subscriptionPlanLimits,
  restaurants,
} from "./db/schema";
import { eq, and, gt, lte, desc, ne, asc } from "drizzle-orm";
import { SubscriptionPlan, SubscriptionPeriod } from "./db/types";
import { unstable_cache } from "next/cache";
import type { DbExecutor } from "./db/transaction";

export const SUBSCRIPTION_PLANS_CACHE_TAG = "subscription-plans";

// Conservée comme erreur métier publique pour les anciens appelants. La
// création n'est désormais jamais bloquée par un quota de publication.
export class SubscriptionLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubscriptionLimitError";
  }
}

export const getPublicSubscriptionPlans = unstable_cache(
  async () =>
    db.query.subscriptionPlans.findMany({
      where: eq(subscriptionPlans.actif, true),
      orderBy: [asc(subscriptionPlans.ordre)],
      with: {
        limits: {
          where: eq(subscriptionPlanLimits.activityType, "restaurant"),
        },
      },
    }),
  ["public-subscription-plans"],
  { tags: [SUBSCRIPTION_PLANS_CACHE_TAG], revalidate: 3_600 },
);

export async function getPartnerAccountIdForRestaurant(
  restaurantId: string,
): Promise<string> {
  const restaurant = await db.query.restaurants.findFirst({
    where: eq(restaurants.id, restaurantId),
    columns: { partnerAccountId: true },
  });
  if (!restaurant) throw new Error("Restaurant introuvable");
  return restaurant.partnerAccountId;
}

/**
 * Récupère le plan d'abonnement actif pour un restaurant.
 * Un restaurant a toujours un plan actif (Découverte par défaut s'il n'y a pas d'historique).
 */
export async function getEffectivePlan(
  partnerAccountId: string,
  options: { executor?: DbExecutor; now?: Date } = {},
): Promise<{
  plan: SubscriptionPlan;
  period: SubscriptionPeriod | null;
}> {
  const executor = options.executor ?? db;
  const now = options.now ?? new Date();

  // Une période Découverte n'est jamais nécessaire : seuls les abonnements
  // payants réellement en cours peuvent remplacer le fallback.
  const activePeriod = await executor.query.subscriptionPeriods.findFirst({
    where: and(
      eq(subscriptionPeriods.partnerAccountId, partnerAccountId),
      eq(subscriptionPeriods.statut, "active"),
      ne(subscriptionPeriods.planCode, "decouverte"),
      lte(subscriptionPeriods.dateDebut, now),
      gt(subscriptionPeriods.dateEcheance, now),
    ),
    orderBy: [desc(subscriptionPeriods.dateDebut)],
  });

  if (activePeriod) {
    const plan = await executor.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.code, activePeriod.planCode)
    });

    if (plan) {
      return { plan, period: activePeriod };
    }
  }

  // Fallback logique : aucune écriture de période gratuite en base.
  const defaultPlan = await executor.query.subscriptionPlans.findFirst({
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
export async function getCommissionRateBps(
  partnerAccountId: string,
  options: { executor?: DbExecutor; now?: Date } = {},
): Promise<number> {
  const { plan, period } = await getEffectivePlan(partnerAccountId, options);
  
  if (period) {
    return period.tauxCommissionBpsFige;
  }
  
  return plan.tauxCommissionBps;
}
