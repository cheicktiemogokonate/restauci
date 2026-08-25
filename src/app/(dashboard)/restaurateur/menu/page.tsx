import MenuManager from "@/components/dashboard/menu/menu-manager";
import { getRestaurateurSession } from "@/lib/auth/get-restaurateur-session";
import { parsePage } from "@/lib/config/pagination";
import { db } from "@/lib/db";
import { getPlats } from "@/lib/db/queries";
import { categories, plats } from "@/lib/db/schema";
import type { Categorie } from "@/types";
import type { PlatAvecCategorie } from "@/types/dashboard";
import { asc, count, eq, sql } from "drizzle-orm";
import { getRestaurantQuotaEligibility } from "@/lib/quota-entitlements";

const PLATS_LIMIT = 12;

export default async function RestaurateurMenuPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    categorie?: string;
    dispo?: string;
  }>;
}) {
  const { restaurant } = await getRestaurateurSession();

  const params = await searchParams;
  const page = parsePage(params.page);
  const search = params.q?.trim() || undefined;
  const categorieId = params.categorie || undefined;

  let disponible: boolean | undefined;
  if (params.dispo === "available") disponible = true;
  if (params.dispo === "unavailable") disponible = false;

  const [categoriesList, platsPage, menuStats, eligibility] = await Promise.all([
    db
      .select({
        id: categories.id,
        restaurantId: categories.restaurantId,
        creneauId: categories.creneauId,
        nom: categories.nom,
        description: categories.description,
        imageUrl: categories.imageUrl,
        ordre: categories.ordre,
        publicationIntent: categories.publicationIntent,
        firstPublishedAt: categories.firstPublishedAt,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,
        platCount: count(plats.id),
      })
      .from(categories)
      .leftJoin(plats, eq(plats.categorieId, categories.id))
      .where(eq(categories.restaurantId, restaurant.id))
      .groupBy(categories.id)
      .orderBy(asc(categories.nom)),
    getPlats({
      restaurantId: restaurant.id,
      page,
      limit: PLATS_LIMIT,
      search,
      categorieId,
      disponible,
    }),
    db
      .select({
        total: count(),
        disponibles: sql<number>`count(*) filter (where ${plats.disponible})`,
        indisponibles: sql<number>`count(*) filter (where not ${plats.disponible})`,
      })
      .from(plats)
      .where(eq(plats.restaurantId, restaurant.id)),
    getRestaurantQuotaEligibility(restaurant.id),
  ]);

  const categoriesWithEligibility = categoriesList.map((category) => ({
    ...category,
    quotaEligible: eligibility.categoryIds.has(category.id),
  }));
  const dishesWithEligibility = platsPage.items.map((dish) => ({
    ...dish,
    quotaEligible: eligibility.dishIds.has(dish.id),
    categoryQuotaEligible: eligibility.categoryIds.has(dish.categorieId),
  }));

  return (
    <MenuManager
      totalPlats={platsPage.total}
      categories={categoriesWithEligibility as (Categorie & { platCount: number; quotaEligible: boolean })[]}
      initialPlats={dishesWithEligibility as (PlatAvecCategorie & { quotaEligible: boolean; categoryQuotaEligible: boolean })[]}
      menuStats={menuStats[0] ?? { total: 0, disponibles: 0, indisponibles: 0 }}
      currentPage={page}
      limit={PLATS_LIMIT}
      currentQ={search}
      currentCategorie={categorieId}
      currentDispo={params.dispo ?? "all"}
      quotaSummary={{
        category: {
          used: eligibility.eligibleCategories.length,
          total: eligibility.totalCategorySlots,
          limit: eligibility.limits.category,
        },
        dish: {
          used: eligibility.eligibleDishes.length,
          total: eligibility.totalDishSlots,
          limit: eligibility.limits.dish,
        },
      }}
    />
  );
}
