import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  sql,
} from "drizzle-orm";
import {
  db,
  transactionalDb,
  type DbExecutor,
  type TransactionExecutor,
} from "@/infrastructure/db";
import {
  categories,
  creneauxHoraires,
  plats,
  restaurants,
} from "@/infrastructure/db/schema";
import {
  attachPublicMediaAsset,
  releasePublicMediaAssets,
} from "@/modules/media/server";
import type {
  CreateMenuDishInput,
  MenuDishListInput,
  UpdateMenuDishInput,
} from "../contracts";
import { MenuDomainError } from "../model";

export async function getRestaurantPartnerAccountRecord(
  restaurantId: string,
  executor: DbExecutor = db,
) {
  return executor.query.restaurants.findFirst({
    where: eq(restaurants.id, restaurantId),
    columns: { id: true, partnerAccountId: true },
  });
}

export async function getMenuQuotaCandidateRecords(
  restaurantId: string,
  executor: DbExecutor = db,
) {
  const categoryRows = await executor
    .select({
      id: categories.id,
      createdAt: categories.createdAt,
      firstPublishedAt: categories.firstPublishedAt,
    })
    .from(categories)
    .where(eq(categories.restaurantId, restaurantId));
  const dishRows = await executor
    .select({
      id: plats.id,
      categoryId: plats.categorieId,
      createdAt: plats.createdAt,
      firstPublishedAt: plats.firstPublishedAt,
    })
    .from(plats)
    .where(eq(plats.restaurantId, restaurantId));
  return { categoryRows, dishRows };
}

export function getMenuCategoryOptionRecords(
  restaurantId: string,
  executor: DbExecutor = db,
) {
  return executor
    .select({ id: categories.id, nom: categories.nom })
    .from(categories)
    .where(eq(categories.restaurantId, restaurantId))
    .orderBy(asc(categories.ordre), asc(categories.nom));
}

export function getMenuCategoryManagementRecords(
  restaurantId: string,
  executor: DbExecutor = db,
) {
  return executor
    .select({
      id: categories.id,
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
    .leftJoin(
      plats,
      and(
        eq(plats.categorieId, categories.id),
        eq(plats.restaurantId, restaurantId),
      ),
    )
    .where(eq(categories.restaurantId, restaurantId))
    .groupBy(categories.id)
    .orderBy(asc(categories.ordre), asc(categories.nom));
}

export async function getMenuDishPageRecords(
  input: MenuDishListInput,
  executor: DbExecutor = db,
) {
  const conditions = [eq(plats.restaurantId, input.restaurantId)];
  if (input.categoryId) {
    conditions.push(eq(plats.categorieId, input.categoryId));
  }
  if (input.disponible !== undefined) {
    conditions.push(eq(plats.disponible, input.disponible));
  }
  if (input.search) conditions.push(ilike(plats.nom, `%${input.search}%`));

  const rows = await executor.query.plats.findMany({
    where: and(...conditions),
    orderBy: [asc(plats.ordre), asc(plats.nom), asc(plats.id)],
    offset: (input.page - 1) * input.limit,
    limit: input.limit,
    with: {
      categorie: { columns: { id: true, nom: true } },
    },
  });
  const totals = await executor
    .select({ count: count() })
    .from(plats)
    .where(and(...conditions));
  return { rows, total: totals[0]?.count ?? 0 };
}

export async function getMenuStatsRecord(
  restaurantId: string,
  executor: DbExecutor = db,
) {
  const rows = await executor
    .select({
      total: count(),
      disponibles: sql<number>`count(*) filter (where ${plats.disponible})`,
      indisponibles: sql<number>`count(*) filter (where not ${plats.disponible})`,
    })
    .from(plats)
    .where(eq(plats.restaurantId, restaurantId));
  return rows[0] ?? { total: 0, disponibles: 0, indisponibles: 0 };
}

export function getMenuDishOrderProjectionRecords(
  restaurantId: string,
  executor: DbExecutor = db,
) {
  return executor
    .select({
      dishId: sql<string>`projection.dish_id`,
      orderCount: sql<number>`projection.completed_quantity::integer`,
    })
    .from(sql`dish_order_projections projection`)
    .where(sql`projection.restaurant_id = ${restaurantId}`);
}

export function getMenuCategoryOrderStatsRecords(
  restaurantId: string,
  executor: DbExecutor = db,
) {
  return executor
    .select({
      name: categories.nom,
      orderCount: sql<number>`coalesce(sum(coalesce((
        SELECT projection.completed_quantity
        FROM dish_order_projections projection
        WHERE projection.dish_id = ${plats.id}
      ), 0)), 0)::integer`,
    })
    .from(categories)
    .leftJoin(
      plats,
      and(
        eq(plats.restaurantId, categories.restaurantId),
        eq(plats.categorieId, categories.id),
      ),
    )
    .where(eq(categories.restaurantId, restaurantId))
    .groupBy(categories.id, categories.nom)
    .orderBy(
      sql`coalesce(sum(coalesce((
        SELECT projection.completed_quantity
        FROM dish_order_projections projection
        WHERE projection.dish_id = ${plats.id}
      ), 0)), 0) DESC`,
      asc(categories.nom),
    );
}

export function getMenuDishRecord(
  dishId: string,
  restaurantId: string,
  executor: DbExecutor = db,
) {
  return executor.query.plats.findFirst({
    where: and(eq(plats.id, dishId), eq(plats.restaurantId, restaurantId)),
    with: { categorie: { columns: { id: true, nom: true } } },
  });
}

export function getSimilarMenuDishRecords(
  dishId: string,
  restaurantId: string,
  categoryId: string,
  limit = 4,
  executor: DbExecutor = db,
) {
  return executor.query.plats.findMany({
    where: and(
      eq(plats.restaurantId, restaurantId),
      eq(plats.categorieId, categoryId),
      ne(plats.id, dishId),
    ),
    orderBy: [
      desc(sql`COALESCE((SELECT projection.completed_quantity FROM dish_order_projections projection WHERE projection.dish_id = ${plats.id}), 0)`),
      asc(plats.nom),
    ],
    limit,
    with: { categorie: { columns: { id: true, nom: true } } },
  });
}

export function getTopMenuDishRecords(
  restaurantId: string,
  limit: number,
  executor: DbExecutor = db,
) {
  return executor.query.plats.findMany({
    where: eq(plats.restaurantId, restaurantId),
    orderBy: [
      desc(sql`COALESCE((SELECT projection.completed_quantity FROM dish_order_projections projection WHERE projection.dish_id = ${plats.id}), 0)`),
      asc(plats.nom),
    ],
    limit,
    with: { categorie: { columns: { id: true, nom: true } } },
  });
}

export function getMenuDishPhotoRecords(
  restaurantId: string,
  dishIds: string[],
  executor: DbExecutor = db,
) {
  if (dishIds.length === 0) return Promise.resolve([]);
  return executor
    .select({ id: plats.id, photoUrl: plats.photoUrl })
    .from(plats)
    .where(
      and(
        eq(plats.restaurantId, restaurantId),
        inArray(plats.id, dishIds),
      ),
    );
}

export function getPublicMenuCategoryRecords(
  restaurantId: string,
  executor: DbExecutor = db,
) {
  return executor.query.categories.findMany({
    where: eq(categories.restaurantId, restaurantId),
    orderBy: [asc(categories.ordre), asc(categories.nom)],
    with: {
      plats: { orderBy: [asc(plats.ordre), asc(plats.nom)] },
    },
  });
}

export function getRestaurantScheduleRecords(
  restaurantId: string,
  executor: DbExecutor = db,
) {
  return executor.query.creneauxHoraires.findMany({
    where: eq(creneauxHoraires.restaurantId, restaurantId),
    orderBy: [asc(creneauxHoraires.heureOuverture), asc(creneauxHoraires.nom)],
  });
}

export function getOrderableDishCandidateRecords(
  restaurantId: string,
  dishIds: string[],
  executor: DbExecutor = db,
) {
  return executor
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
    .innerJoin(
      categories,
      and(
        eq(categories.id, plats.categorieId),
        eq(categories.restaurantId, plats.restaurantId),
      ),
    )
    .where(
      and(
        eq(plats.restaurantId, restaurantId),
        inArray(plats.id, dishIds),
      ),
    );
}

export function findMenuCategoryRecord(
  categoryId: string,
  restaurantId: string,
  executor: DbExecutor = db,
) {
  return executor.query.categories.findFirst({
    where: and(
      eq(categories.id, categoryId),
      eq(categories.restaurantId, restaurantId),
    ),
  });
}

export function findMenuCategoryByNameRecord(
  name: string,
  restaurantId: string,
  executor: DbExecutor = db,
) {
  return executor.query.categories.findFirst({
    where: and(
      eq(categories.restaurantId, restaurantId),
      sql`lower(${categories.nom}) = lower(${name})`,
    ),
  });
}

export function createMenuCategoryRecord(input: {
  restaurantId: string;
  nom: string;
  description?: string;
  imageUrl?: string;
  ordre?: number;
  creneauId?: string | null;
}) {
  return db
    .insert(categories)
    .values({
      ...input,
      ordre: input.ordre ?? 0,
      firstPublishedAt: new Date(),
    })
    .returning()
    .then((rows) => rows[0]);
}

export function renameMenuCategoryRecord(
  categoryId: string,
  restaurantId: string,
  name: string,
) {
  return db
    .update(categories)
    .set({ nom: name, updatedAt: new Date() })
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.restaurantId, restaurantId),
      ),
    )
    .returning()
    .then((rows) => rows[0]);
}

export function setMenuCategoryPublicationRecord(
  categoryId: string,
  restaurantId: string,
  publicationIntent: boolean,
) {
  return db
    .update(categories)
    .set({
      publicationIntent,
      firstPublishedAt: publicationIntent
        ? sql`coalesce(${categories.firstPublishedAt}, now())`
        : categories.firstPublishedAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.restaurantId, restaurantId),
      ),
    )
    .returning()
    .then((rows) => rows[0]);
}

async function resolveDishCategory(
  tx: TransactionExecutor,
  input: CreateMenuDishInput,
) {
  if (input.categorieId) {
    const category = await findMenuCategoryRecord(
      input.categorieId,
      input.restaurantId,
      tx,
    );
    if (!category) {
      throw new MenuDomainError(
        "CATEGORY_NOT_FOUND",
        "Cette catégorie n’appartient pas au Restaurant.",
      );
    }
    return category;
  }

  const name = input.newCategorieName!;
  const existing = await findMenuCategoryByNameRecord(
    name,
    input.restaurantId,
    tx,
  );
  if (existing) return existing;
  const inserted = await tx
    .insert(categories)
    .values({
      restaurantId: input.restaurantId,
      nom: name,
      ordre: 0,
      firstPublishedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning();
  const category =
    inserted[0] ??
    (await findMenuCategoryByNameRecord(name, input.restaurantId, tx));
  if (!category) {
    throw new MenuDomainError(
      "CATEGORY_NAME_TAKEN",
      "Une catégorie porte déjà ce nom.",
    );
  }
  return category;
}

export function createMenuDishRecord(input: CreateMenuDishInput) {
  if (input.photoUrl && !input.photoAssetId) {
    throw new MenuDomainError(
      "MEDIA_ASSET_REQUIRED",
      "La photo doit provenir d’un asset temporaire de la plateforme.",
    );
  }
  const dishId = crypto.randomUUID();
  return transactionalDb.transaction(async (tx) => {
    const category = await resolveDishCategory(tx, input);
    let photoUrl = input.photoUrl;
    if (input.photoAssetId) {
      const asset = await attachPublicMediaAsset(tx, {
        assetId: input.photoAssetId,
        ownerUserId: input.ownerUserId,
        targetType: "dish_photo",
        targetId: dishId,
      });
      photoUrl = asset.publicUrl;
    }
    const rows = await tx
      .insert(plats)
      .values({
        id: dishId,
        restaurantId: input.restaurantId,
        categorieId: category.id,
        creneauId: input.creneauId,
        nom: input.nom,
        description: input.description,
        prix: input.prix,
        photoUrl,
        disponible: input.disponible,
        ordre: input.ordre,
        tags: input.tags,
        allergenes: input.allergenes,
        firstPublishedAt: new Date(),
      })
      .returning();
    return rows[0]!;
  });
}

export function updateMenuDishRecord(input: UpdateMenuDishInput) {
  return transactionalDb.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM ${plats} WHERE id = ${input.dishId} AND restaurant_id = ${input.restaurantId} FOR UPDATE`,
    );
    const current = await getMenuDishRecord(
      input.dishId,
      input.restaurantId,
      tx,
    );
    if (!current) {
      throw new MenuDomainError("DISH_NOT_FOUND", "Plat introuvable.");
    }
    if (input.categorieId) {
      const category = await findMenuCategoryRecord(
        input.categorieId,
        input.restaurantId,
        tx,
      );
      if (!category) {
        throw new MenuDomainError(
          "CATEGORY_NOT_FOUND",
          "Cette catégorie n’appartient pas au Restaurant.",
        );
      }
    }
    if (
      !input.photoAssetId &&
      input.photoUrl &&
      input.photoUrl !== current.photoUrl
    ) {
      throw new MenuDomainError(
        "MEDIA_ASSET_REQUIRED",
        "La photo doit provenir d’un asset temporaire de la plateforme.",
      );
    }

    let photoUrl = input.photoUrl;
    if (input.photoAssetId) {
      const asset = await attachPublicMediaAsset(tx, {
        assetId: input.photoAssetId,
        ownerUserId: input.ownerUserId,
        targetType: "dish_photo",
        targetId: input.dishId,
      });
      photoUrl = asset.publicUrl;
      await releasePublicMediaAssets(tx, {
        targetType: "dish_photo",
        targetId: input.dishId,
        keepAssetIds: [asset.id],
      });
    } else if (input.photoUrl === null) {
      await releasePublicMediaAssets(tx, {
        targetType: "dish_photo",
        targetId: input.dishId,
      });
    }

    const rows = await tx
      .update(plats)
      .set({
        ...(input.categorieId !== undefined
          ? { categorieId: input.categorieId }
          : {}),
        ...(input.creneauId !== undefined
          ? { creneauId: input.creneauId }
          : {}),
        ...(input.nom !== undefined ? { nom: input.nom } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.prix !== undefined ? { prix: input.prix } : {}),
        ...(input.photoUrl !== undefined || input.photoAssetId
          ? { photoUrl }
          : {}),
        ...(input.disponible !== undefined
          ? { disponible: input.disponible }
          : {}),
        ...(input.ordre !== undefined ? { ordre: input.ordre } : {}),
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
        ...(input.allergenes !== undefined
          ? { allergenes: input.allergenes }
          : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(plats.id, input.dishId),
          eq(plats.restaurantId, input.restaurantId),
        ),
      )
      .returning();
    return rows[0]!;
  });
}

export function deleteMenuDishRecord(dishId: string, restaurantId: string) {
  return transactionalDb.transaction(async (tx) => {
    const rows = await tx
      .delete(plats)
      .where(
        and(eq(plats.id, dishId), eq(plats.restaurantId, restaurantId)),
      )
      .returning({ id: plats.id });
    if (rows.length > 0) {
      await releasePublicMediaAssets(tx, {
        targetType: "dish_photo",
        targetId: dishId,
      });
    }
    return rows;
  });
}

export function setMenuDishAvailabilityRecord(
  dishId: string,
  restaurantId: string,
  disponible: boolean,
) {
  return db
    .update(plats)
    .set({ disponible, updatedAt: new Date() })
    .where(and(eq(plats.id, dishId), eq(plats.restaurantId, restaurantId)))
    .returning()
    .then((rows) => rows[0]);
}

export function setMenuDishPublicationRecord(
  dishId: string,
  restaurantId: string,
  publicationIntent: boolean,
) {
  return db
    .update(plats)
    .set({
      publicationIntent,
      firstPublishedAt: publicationIntent
        ? sql`coalesce(${plats.firstPublishedAt}, now())`
        : plats.firstPublishedAt,
      updatedAt: new Date(),
    })
    .where(and(eq(plats.id, dishId), eq(plats.restaurantId, restaurantId)))
    .returning()
    .then((rows) => rows[0]);
}

export async function lockRestaurantMenuRecords(
  restaurantId: string,
  tx: TransactionExecutor,
) {
  await tx.execute(
    sql`SELECT id FROM ${categories} WHERE restaurant_id = ${restaurantId} FOR SHARE`,
  );
  await tx.execute(
    sql`SELECT id FROM ${plats} WHERE restaurant_id = ${restaurantId} FOR SHARE`,
  );
}

export function incrementMenuDishOrderCountsRecord(
  restaurantId: string,
  items: Array<{ dishId: string; quantity: number }>,
  tx: TransactionExecutor,
) {
  const requestedItems = sql.join(
    items.map((item) => sql`(${item.dishId}, ${item.quantity})`),
    sql`, `,
  );
  return tx.execute(sql`
    UPDATE "plats" AS dish
    SET
      "nombre_commandes" = dish."nombre_commandes" + requested.quantity::integer,
      "updated_at" = NOW()
    FROM (VALUES ${requestedItems}) AS requested(id, quantity)
    WHERE dish."id" = requested.id::varchar
      AND dish."restaurant_id" = ${restaurantId}
  `);
}
