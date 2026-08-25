import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  categories,
  creneauxHoraires,
  plats,
  restaurants,
  subscriptionPeriodLimits,
  subscriptionPlanLimits,
} from "@/lib/db/schema";
import { getEffectivePlan } from "@/lib/subscription-plans";
import { selectQuotaEligibleResources } from "@/lib/quota-selection";
import type { DbExecutor } from "@/lib/db/transaction";
import { isPlatDisponible } from "@/lib/utils/creneaux";

export type RestaurantLimits = { category: number | null; dish: number | null };

export class CommercialEligibilityError extends Error {
  constructor(message = "Un ou plusieurs plats ne sont pas commandables") {
    super(message);
    this.name = "CommercialEligibilityError";
  }
}

function requireRestaurantLimits(
  rows: { resourceType: "category" | "dish" | "residence"; maxCount: number | null }[],
  source: string,
): RestaurantLimits {
  const values = new Map(rows.map((row) => [row.resourceType, row.maxCount]));
  if (!values.has("category") || !values.has("dish")) {
    throw new Error(`Configuration de quotas incomplète (${source})`);
  }
  return { category: values.get("category")!, dish: values.get("dish")! };
}

export async function getEffectiveLimits(
  partnerAccountId: string,
  options: { executor?: DbExecutor; now?: Date } = {},
) {
  const executor = options.executor ?? db;
  const { plan, period } = await getEffectivePlan(partnerAccountId, options);
  if (period) {
    const rows = await executor
      .select({
        resourceType: subscriptionPeriodLimits.resourceType,
        maxCount: subscriptionPeriodLimits.maxCount,
      })
      .from(subscriptionPeriodLimits)
      .where(
        and(
          eq(subscriptionPeriodLimits.subscriptionPeriodId, period.id),
          eq(subscriptionPeriodLimits.activityType, "restaurant"),
        ),
      );
    return {
      source: "period" as const,
      plan,
      period,
      limits: requireRestaurantLimits(rows, `période ${period.id}`),
    };
  }

  const rows = await executor
    .select({
      resourceType: subscriptionPlanLimits.resourceType,
      maxCount: subscriptionPlanLimits.maxCount,
    })
    .from(subscriptionPlanLimits)
    .where(
      and(
        eq(subscriptionPlanLimits.planId, plan.id),
        eq(subscriptionPlanLimits.activityType, "restaurant"),
      ),
    );
  return {
    source: "catalog" as const,
    plan,
    period: null,
    limits: requireRestaurantLimits(rows, `offre ${plan.code}`),
  };
}

export async function getRestaurantQuotaEligibility(
  restaurantId: string,
  options: { executor?: DbExecutor; now?: Date } = {},
) {
  const executor = options.executor ?? db;
  const restaurant = await executor.query.restaurants.findFirst({
    where: eq(restaurants.id, restaurantId),
    columns: { partnerAccountId: true },
  });
  if (!restaurant) throw new Error("Restaurant introuvable");

  const [entitlement, categoryRows, dishRows] = await Promise.all([
    getEffectiveLimits(restaurant.partnerAccountId, options),
    executor
      .select({
        id: categories.id,
        createdAt: categories.createdAt,
        firstPublishedAt: categories.firstPublishedAt,
      })
      .from(categories)
      .where(eq(categories.restaurantId, restaurantId)),
    executor
      .select({
        id: plats.id,
        categorieId: plats.categorieId,
        createdAt: plats.createdAt,
        firstPublishedAt: plats.firstPublishedAt,
      })
      .from(plats)
      .where(eq(plats.restaurantId, restaurantId)),
  ]);

  const selection = selectQuotaEligibleResources(categoryRows, dishRows, entitlement.limits);
  return {
    ...entitlement,
    ...selection,
    totalCategorySlots: categoryRows.filter((category) => category.firstPublishedAt !== null).length,
    totalDishSlots: dishRows.filter((dish) => dish.firstPublishedAt !== null).length,
  };
}

export async function getPublicRestaurantMenu(
  restaurantId: string,
  options: { now?: Date } = {},
) {
  const [eligibility, categoryRows] = await Promise.all([
    getRestaurantQuotaEligibility(restaurantId),
    db.query.categories.findMany({
      where: eq(categories.restaurantId, restaurantId),
      orderBy: (category, { asc }) => [asc(category.ordre)],
      with: {
        plats: {
          orderBy: (dish, { asc }) => [asc(dish.ordre)],
          with: { creneau: true },
        },
        creneau: true,
      },
    }),
  ]);

  return categoryRows
    .filter(
      (category) =>
        category.publicationIntent && eligibility.categoryIds.has(category.id),
    )
    .map((category) => ({
      ...category,
      quotaEligible: true as const,
      plats: category.plats.filter(
        (dish) =>
          dish.publicationIntent &&
          dish.disponible &&
          eligibility.dishIds.has(dish.id),
      ).map((dish) => ({
        ...dish,
        commandableNow: isPlatDisponible(
          dish,
          category,
          [dish.creneau, category.creneau].filter(
            (schedule): schedule is NonNullable<typeof schedule> => Boolean(schedule),
          ),
          { now: options.now },
        ),
      })),
    }));
}

export async function assertDishesCommerciallyEligible(
  restaurantId: string,
  dishIds: string[],
  options: { executor?: DbExecutor; now?: Date } = {},
) {
  const executor = options.executor ?? db;
  const uniqueIds = [...new Set(dishIds)];
  if (uniqueIds.length === 0) throw new CommercialEligibilityError("Panier vide");
  const [eligibility, rows, schedules] = await Promise.all([
    getRestaurantQuotaEligibility(restaurantId, options),
    executor
      .select({
        id: plats.id,
        nom: plats.nom,
        prix: plats.prix,
        disponible: plats.disponible,
        publicationIntent: plats.publicationIntent,
        categorieId: plats.categorieId,
        categoryPublicationIntent: categories.publicationIntent,
        dishScheduleId: plats.creneauId,
        categoryScheduleId: categories.creneauId,
      })
      .from(plats)
      .innerJoin(categories, eq(categories.id, plats.categorieId))
      .where(
        and(
          eq(plats.restaurantId, restaurantId),
          eq(categories.restaurantId, restaurantId),
          inArray(plats.id, uniqueIds),
        ),
      ),
    executor.query.creneauxHoraires.findMany({
      where: eq(creneauxHoraires.restaurantId, restaurantId),
      columns: {
        id: true,
        actif: true,
        joursActifs: true,
        heureOuverture: true,
        heureFermeture: true,
      },
    }),
  ]);

  if (
    rows.length !== uniqueIds.length ||
    rows.some(
      (dish) =>
        !dish.disponible ||
        !dish.publicationIntent ||
        !dish.categoryPublicationIntent ||
        !eligibility.categoryIds.has(dish.categorieId) ||
        !eligibility.dishIds.has(dish.id) ||
        !isPlatDisponible(
          { disponible: dish.disponible, creneauId: dish.dishScheduleId },
          { creneauId: dish.categoryScheduleId },
          schedules,
          { now: options.now },
        ),
    )
  ) {
    throw new CommercialEligibilityError();
  }
  return rows;
}
