import "server-only";

import type { DbExecutor, TransactionExecutor } from "@/infrastructure/db";
import { invalidateRestaurantCache } from "@/infrastructure/cache";
import {
  getEffectiveRestaurantQuota,
} from "@/modules/quotas/server";
import { selectRestaurantQuotaEligibleResources } from "@/modules/quotas/model";
import {
  createMenuDishSchema,
  menuCategoryNameSchema,
  menuDishListSchema,
  menuResourceIdSchema,
  updateMenuDishSchema,
  type CreateMenuDishInput,
  type MenuCategoryManagementDTO,
  type MenuDishDTO,
  type MenuDishListInput,
  type MenuManagementWorkspaceDTO,
  type PublicMenuCategoryDTO,
  type UpdateMenuDishInput,
} from "./contracts";
import {
  isDishAvailable,
  isDishOrderable,
  isDishPubliclyVisible,
  MenuDomainError,
} from "./model";
import {
  createMenuCategoryRecord,
  createMenuDishRecord,
  deleteMenuDishRecord,
  findMenuCategoryByNameRecord,
  findMenuCategoryRecord,
  getMenuCategoryManagementRecords,
  getMenuCategoryOptionRecords,
  getMenuDishPageRecords,
  getMenuDishRecord,
  getMenuQuotaCandidateRecords,
  getMenuStatsRecord,
  getMenuDishOrderProjectionRecords,
  getMenuCategoryOrderStatsRecords,
  getOrderableDishCandidateRecords,
  getPublicMenuCategoryRecords,
  getRestaurantPartnerAccountRecord,
  getRestaurantScheduleRecords,
  getSimilarMenuDishRecords,
  getTopMenuDishRecords,
  getMenuDishPhotoRecords,
  lockRestaurantMenuRecords,
  incrementMenuDishOrderCountsRecord,
  renameMenuCategoryRecord,
  setMenuCategoryPublicationRecord,
  setMenuDishAvailabilityRecord,
  setMenuDishPublicationRecord,
  updateMenuDishRecord,
} from "./_internal/persistence";

function toIso(value: Date | null) {
  return value?.toISOString() ?? null;
}

function isCategoryNameConstraint(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "constraint" in error &&
    error.constraint === "categories_restaurant_name_unique"
  );
}

function toMenuDishDTO(
  row: Awaited<ReturnType<typeof getMenuDishRecord>> extends infer Row
    ? NonNullable<Row>
    : never,
  eligibility: { categoryIds: Set<string>; dishIds: Set<string> },
  orderCounts: ReadonlyMap<string, number>,
): MenuDishDTO {
  return {
    id: row.id,
    categorieId: row.categorieId,
    creneauId: row.creneauId,
    nom: row.nom,
    description: row.description,
    prix: row.prix,
    photoUrl: row.photoUrl,
    disponible: row.disponible,
    publicationIntent: row.publicationIntent,
    firstPublishedAt: toIso(row.firstPublishedAt),
    ordre: row.ordre,
    tags: row.tags ?? [],
    allergenes: row.allergenes ?? [],
    nombreCommandes: orderCounts.get(row.id) ?? 0,
    noteMoyenne: row.noteMoyenne ?? 0,
    nombreAvis: row.nombreAvis,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    categorie: { id: row.categorie.id, nom: row.categorie.nom },
    quotaEligible: eligibility.dishIds.has(row.id),
    categoryQuotaEligible: eligibility.categoryIds.has(row.categorieId),
  };
}

export async function getRestaurantMenuQuotaEligibility(
  restaurantId: string,
  options: { executor?: DbExecutor; now?: Date } = {},
) {
  const restaurant = await getRestaurantPartnerAccountRecord(
    restaurantId,
    options.executor,
  );
  if (!restaurant) throw new Error("Restaurant introuvable.");
  const entitlement = await getEffectiveRestaurantQuota(
    restaurant.partnerAccountId,
    options,
  );
  const { categoryRows, dishRows } = await getMenuQuotaCandidateRecords(
    restaurantId,
    options.executor,
  );
  const selection = selectRestaurantQuotaEligibleResources(
    categoryRows,
    dishRows,
    entitlement.limits,
  );
  return {
    ...entitlement,
    ...selection,
    totalCategorySlots: categoryRows.filter(
      (category) => category.firstPublishedAt !== null,
    ).length,
    totalDishSlots: dishRows.filter((dish) => dish.firstPublishedAt !== null)
      .length,
  };
}

export async function getMenuManagementWorkspace(
  input: MenuDishListInput,
): Promise<MenuManagementWorkspaceDTO> {
  const parsed = menuDishListSchema.parse(input);
  const eligibility = await getRestaurantMenuQuotaEligibility(
    parsed.restaurantId,
  );
  const [categoryRows, dishPage, stats, orderCountRows] = await Promise.all([
    getMenuCategoryManagementRecords(parsed.restaurantId),
    getMenuDishPageRecords(parsed),
    getMenuStatsRecord(parsed.restaurantId),
    getMenuDishOrderProjectionRecords(parsed.restaurantId),
  ]);
  const orderCounts = new Map(
    orderCountRows.map((row) => [row.dishId, Number(row.orderCount)]),
  );

  const categories: MenuCategoryManagementDTO[] = categoryRows.map((row) => ({
    id: row.id,
    creneauId: row.creneauId,
    nom: row.nom,
    description: row.description,
    imageUrl: row.imageUrl,
    ordre: row.ordre,
    publicationIntent: row.publicationIntent,
    firstPublishedAt: toIso(row.firstPublishedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    platCount: row.platCount,
    quotaEligible: eligibility.categoryIds.has(row.id),
  }));
  const dishes = dishPage.rows.map((row) =>
    toMenuDishDTO(row, eligibility, orderCounts),
  );

  return {
    categories,
    dishes,
    totalDishes: dishPage.total,
    page: parsed.page,
    limit: parsed.limit,
    stats,
    quotaSummary: {
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
    },
  };
}

export function getMenuCategoryOptions(restaurantId: string) {
  return getMenuCategoryOptionRecords(restaurantId);
}

export function getMenuCategoryOrderStats(restaurantId: string) {
  return getMenuCategoryOrderStatsRecords(restaurantId);
}

export async function getMenuDishDetailWorkspace(
  dishId: string,
  restaurantId: string,
) {
  const parsedDishId = menuResourceIdSchema.parse(dishId);
  const dish = await getMenuDishRecord(parsedDishId, restaurantId);
  if (!dish) return null;
  const eligibility = await getRestaurantMenuQuotaEligibility(restaurantId);
  const [categories, similarRows, orderCountRows] = await Promise.all([
    getMenuCategoryOptionRecords(restaurantId),
    getSimilarMenuDishRecords(
      dish.id,
      restaurantId,
      dish.categorieId,
    ),
    getMenuDishOrderProjectionRecords(restaurantId),
  ]);
  const orderCounts = new Map(
    orderCountRows.map((row) => [row.dishId, Number(row.orderCount)]),
  );
  return {
    dish: toMenuDishDTO(dish, eligibility, orderCounts),
    categories,
    similarDishes: similarRows.map((row) =>
      toMenuDishDTO(row, eligibility, orderCounts),
    ),
  };
}

export async function getTopMenuDishes(restaurantId: string, limit = 5) {
  const eligibility = await getRestaurantMenuQuotaEligibility(restaurantId);
  const rows = await getTopMenuDishRecords(
    restaurantId,
    Math.min(Math.max(limit, 1), 20),
  );
  const orderCountRows = await getMenuDishOrderProjectionRecords(restaurantId);
  const orderCounts = new Map(
    orderCountRows.map((row) => [row.dishId, Number(row.orderCount)]),
  );
  return rows.map((row) => toMenuDishDTO(row, eligibility, orderCounts));
}

export function getMenuDishPhotos(restaurantId: string, dishIds: string[]) {
  return getMenuDishPhotoRecords(
    restaurantId,
    [...new Set(dishIds.map((id) => menuResourceIdSchema.parse(id)))],
  );
}

export async function getPublicRestaurantMenu(
  restaurantId: string,
  options: { now?: Date; executor?: DbExecutor } = {},
): Promise<PublicMenuCategoryDTO[]> {
  const eligibility = await getRestaurantMenuQuotaEligibility(
    restaurantId,
    options,
  );
  const categoryRows = await getPublicMenuCategoryRecords(
    restaurantId,
    options.executor,
  );
  const schedules = await getRestaurantScheduleRecords(
    restaurantId,
    options.executor,
  );
  const orderCountRows = await getMenuDishOrderProjectionRecords(
    restaurantId,
    options.executor,
  );
  const orderCounts = new Map(
    orderCountRows.map((row) => [row.dishId, Number(row.orderCount)]),
  );

  return categoryRows
    .filter((category) =>
      isDishPubliclyVisible({
        dishPublicationIntent: true,
        categoryPublicationIntent: category.publicationIntent,
        dishQuotaEligible: true,
        categoryQuotaEligible: eligibility.categoryIds.has(category.id),
      }),
    )
    .map((category) => ({
      id: category.id,
      nom: category.nom,
      description: category.description,
      imageUrl: category.imageUrl,
      ordre: category.ordre,
      plats: category.plats
        .filter(
          (dish) =>
            dish.disponible &&
            isDishPubliclyVisible({
              dishPublicationIntent: dish.publicationIntent,
              categoryPublicationIntent: category.publicationIntent,
              dishQuotaEligible: eligibility.dishIds.has(dish.id),
              categoryQuotaEligible: eligibility.categoryIds.has(category.id),
            }),
        )
        .map((dish) => {
          const commandableNow = isDishAvailable(
            dish,
            category,
            schedules,
            { now: options.now },
          );
          return {
            id: dish.id,
            categorieId: dish.categorieId,
            nom: dish.nom,
            description: dish.description,
            prix: dish.prix,
            photoUrl: dish.photoUrl,
            disponible: commandableNow,
            commandableNow,
            nombreCommandes: orderCounts.get(dish.id) ?? 0,
            noteMoyenne: dish.noteMoyenne ?? 0,
            nombreAvis: dish.nombreAvis,
            tags: dish.tags ?? [],
            allergenes: dish.allergenes ?? [],
          };
        }),
    }));
}

export async function createMenuCategory(
  restaurantId: string,
  name: string,
) {
  const parsedName = menuCategoryNameSchema.parse(name);
  const existing = await findMenuCategoryByNameRecord(
    parsedName,
    restaurantId,
  );
  if (existing) {
    throw new MenuDomainError(
      "CATEGORY_NAME_TAKEN",
      "Une catégorie porte déjà ce nom.",
    );
  }
  let category;
  try {
    category = await createMenuCategoryRecord({
      restaurantId,
      nom: parsedName,
    });
  } catch (error) {
    if (isCategoryNameConstraint(error)) {
      throw new MenuDomainError(
        "CATEGORY_NAME_TAKEN",
        "Une catégorie porte déjà ce nom.",
      );
    }
    throw error;
  }
  if (!category) {
    throw new MenuDomainError(
      "CATEGORY_NAME_TAKEN",
      "Une catégorie porte déjà ce nom.",
    );
  }
  await invalidateRestaurantCache(restaurantId);
  return category;
}

export async function renameMenuCategory(
  restaurantId: string,
  categoryId: string,
  name: string,
) {
  const parsedId = menuResourceIdSchema.parse(categoryId);
  const parsedName = menuCategoryNameSchema.parse(name);
  const [category, sameName] = await Promise.all([
    findMenuCategoryRecord(parsedId, restaurantId),
    findMenuCategoryByNameRecord(parsedName, restaurantId),
  ]);
  if (!category) {
    throw new MenuDomainError("CATEGORY_NOT_FOUND", "Catégorie introuvable.");
  }
  if (sameName && sameName.id !== parsedId) {
    throw new MenuDomainError(
      "CATEGORY_NAME_TAKEN",
      "Une catégorie porte déjà ce nom.",
    );
  }
  let updated;
  try {
    updated = await renameMenuCategoryRecord(
      parsedId,
      restaurantId,
      parsedName,
    );
  } catch (error) {
    if (isCategoryNameConstraint(error)) {
      throw new MenuDomainError(
        "CATEGORY_NAME_TAKEN",
        "Une catégorie porte déjà ce nom.",
      );
    }
    throw error;
  }
  await invalidateRestaurantCache(restaurantId);
  return updated;
}

export async function setMenuCategoryPublication(
  restaurantId: string,
  categoryId: string,
  publicationIntent: boolean,
) {
  const updated = await setMenuCategoryPublicationRecord(
    menuResourceIdSchema.parse(categoryId),
    restaurantId,
    publicationIntent,
  );
  await invalidateRestaurantCache(restaurantId);
  return updated;
}

export async function createMenuDish(input: CreateMenuDishInput) {
  const parsed = createMenuDishSchema.parse(input);
  const dish = await createMenuDishRecord(parsed);
  await invalidateRestaurantCache(parsed.restaurantId);
  return dish;
}

export async function updateMenuDish(input: UpdateMenuDishInput) {
  const parsed = updateMenuDishSchema.parse(input);
  const dish = await updateMenuDishRecord(parsed);
  await invalidateRestaurantCache(parsed.restaurantId);
  return dish;
}

export async function deleteMenuDish(dishId: string, restaurantId: string) {
  const deleted = await deleteMenuDishRecord(
    menuResourceIdSchema.parse(dishId),
    restaurantId,
  );
  await invalidateRestaurantCache(restaurantId);
  return deleted;
}

export async function setMenuDishAvailability(
  dishId: string,
  restaurantId: string,
  disponible: boolean,
) {
  const dish = await setMenuDishAvailabilityRecord(
    menuResourceIdSchema.parse(dishId),
    restaurantId,
    disponible,
  );
  await invalidateRestaurantCache(restaurantId);
  return dish;
}

export async function setMenuDishPublication(
  dishId: string,
  restaurantId: string,
  publicationIntent: boolean,
) {
  const dish = await setMenuDishPublicationRecord(
    menuResourceIdSchema.parse(dishId),
    restaurantId,
    publicationIntent,
  );
  await invalidateRestaurantCache(restaurantId);
  return dish;
}

export async function assertRestaurantDishesOrderable(
  restaurantId: string,
  dishIds: string[],
  options: { executor?: DbExecutor; now?: Date } = {},
) {
  const uniqueIds = [...new Set(dishIds.map((id) => menuResourceIdSchema.parse(id)))];
  if (uniqueIds.length === 0) {
    throw new MenuDomainError("DISH_NOT_ORDERABLE", "Panier vide.");
  }
  const eligibility = await getRestaurantMenuQuotaEligibility(
    restaurantId,
    options,
  );
  const rows = await getOrderableDishCandidateRecords(
    restaurantId,
    uniqueIds,
    options.executor,
  );
  const schedules = await getRestaurantScheduleRecords(
    restaurantId,
    options.executor,
  );
  if (
    rows.length !== uniqueIds.length ||
    rows.some(
      (dish) =>
        !isDishOrderable(
          {
            dishPublicationIntent: dish.publicationIntent,
            categoryPublicationIntent: dish.categoryPublicationIntent,
            dishQuotaEligible: eligibility.dishIds.has(dish.id),
            categoryQuotaEligible: eligibility.categoryIds.has(
              dish.categorieId,
            ),
          },
          { disponible: dish.disponible, creneauId: dish.dishScheduleId },
          { creneauId: dish.categoryScheduleId },
          schedules,
          { now: options.now },
        ),
    )
  ) {
    throw new MenuDomainError(
      "DISH_NOT_ORDERABLE",
      "Un ou plusieurs plats ne sont pas commandables.",
    );
  }
  return rows.map(({ id, nom, prix }) => ({ id, nom, prix }));
}

export function lockRestaurantMenuForOrder(
  restaurantId: string,
  tx: TransactionExecutor,
) {
  return lockRestaurantMenuRecords(restaurantId, tx);
}

export function recordMenuDishOrdersAccepted(
  restaurantId: string,
  items: Array<{ dishId: string; quantity: number }>,
  tx: TransactionExecutor,
) {
  return incrementMenuDishOrderCountsRecord(restaurantId, items, tx);
}
