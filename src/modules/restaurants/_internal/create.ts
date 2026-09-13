import "server-only";

import { db } from "@/infrastructure/db";
import { transactionalDb } from "@/infrastructure/db";
import {
  categories,
  creneauxHoraires,
  plats,
  restaurants,
} from "@/infrastructure/db/schema";
import { env } from "@/infrastructure/env";
import { getPartnerAccountById } from "@/modules/partners/server";
import type { CreateRestaurantInput } from "../contracts";
import { RestaurantDomainError, restaurantSlugBase } from "../model";
import { prepareRestaurantMarketAssignment } from "./location";
import { attachPublicMediaAsset } from "@/modules/media/server";

async function assertRestaurantCreationAllowed(partnerAccountId: string) {
  const account = await getPartnerAccountById(partnerAccountId);
  if (!account || account.activityType !== "restaurant") {
    throw new RestaurantDomainError(
      "RESTAURANT_ACTIVITY_REQUIRED",
      "Ce compte partenaire n’est pas rattaché à l’activité Restaurant.",
    );
  }
  const existing = await db.query.restaurants.findFirst({
    where: (restaurant, { eq }) =>
      eq(restaurant.partnerAccountId, partnerAccountId),
    columns: { id: true },
  });
  if (existing) {
    throw new RestaurantDomainError(
      "RESTAURANT_ALREADY_EXISTS",
      "Ce compte partenaire possède déjà un Restaurant.",
    );
  }
  return account;
}

export async function createRestaurantRecord(
  input: CreateRestaurantInput,
  menuPolicy: {
    initialCategoryNames: string[];
    dishLimit: number | null;
    planCode: string;
  },
) {
  const account = await assertRestaurantCreationAllowed(input.partnerAccountId);
  if (
    (input.logoUrl && !input.logoAssetId) ||
    (input.banniereUrl && !input.banniereAssetId) ||
    input.menu?.some((item) => item.photoUrl && !item.photoAssetId)
  ) {
    throw new RestaurantDomainError(
      "RESTAURANT_MEDIA_INVALID",
      "Chaque nouvelle image doit provenir d’un asset temporaire de la plateforme.",
    );
  }
  let slug = restaurantSlugBase(input.nom);
  const existingSlug = await db.query.restaurants.findFirst({
    where: (restaurant, { eq }) => eq(restaurant.slug, slug),
    columns: { id: true },
  });
  if (existingSlug) slug = `${slug}-${crypto.randomUUID().slice(0, 8)}`;

  const {
    schedule = [],
    menu = [],
    logoAssetId,
    banniereAssetId,
    ...restaurantInput
  } = input;
  let marketAssignment:
    | Awaited<ReturnType<typeof prepareRestaurantMarketAssignment>>
    | null = null;
  if (env.RESTAURANT_GEO_POLICY_MODE !== "off") {
    try {
      marketAssignment = await prepareRestaurantMarketAssignment({
        latitude: input.latitude,
        longitude: input.longitude,
      });
    } catch (error) {
      if (env.RESTAURANT_GEO_POLICY_MODE === "enforce") throw error;
    }
  }

  const initialCategories = menuPolicy.initialCategoryNames;
  const allowedCategories = new Set<string>(initialCategories);
  if (menu.length > 1) {
    throw new Error("L’onboarding permet d’ajouter un seul plat de démarrage.");
  }
  if (
    menuPolicy.dishLimit !== null &&
    menu.length > menuPolicy.dishLimit
  ) {
    throw new Error(
      `L’offre ${menuPolicy.planCode} autorise au maximum ${menuPolicy.dishLimit} plats.`,
    );
  }
  if (menu.some((item) => !allowedCategories.has(item.categorie.trim()))) {
    throw new Error(
      "Un plat utilise une catégorie qui ne fait pas partie des catégories initiales autorisées.",
    );
  }

  const restaurantId = crypto.randomUUID();
  const categoriesWithIds = initialCategories.map((nom, ordre) => ({
    id: crypto.randomUUID(),
    restaurantId,
    nom,
    ordre,
    firstPublishedAt: new Date(),
  }));
  const categoriesByName = new Map<string, string>(
    categoriesWithIds.map((category) => [category.nom, category.id]),
  );
  const menuWithIds = menu.map((item, index) => ({
    ...item,
    id: crypto.randomUUID(),
    order: index,
  }));

  await transactionalDb.transaction(async (tx) => {
    const logoAsset = logoAssetId
      ? await attachPublicMediaAsset(tx, {
          assetId: logoAssetId,
          ownerUserId: account.userId,
          targetType: "restaurant_logo",
          targetId: restaurantId,
        })
      : null;
    const bannerAsset = banniereAssetId
      ? await attachPublicMediaAsset(tx, {
          assetId: banniereAssetId,
          ownerUserId: account.userId,
          targetType: "restaurant_banner",
          targetId: restaurantId,
        })
      : null;
    const dishAssets = new Map<string, string>();
    for (const item of menuWithIds) {
      if (!item.photoAssetId) continue;
      const asset = await attachPublicMediaAsset(tx, {
        assetId: item.photoAssetId,
        ownerUserId: account.userId,
        targetType: "dish_photo",
        targetId: item.id,
      });
      dishAssets.set(item.id, asset.publicUrl);
    }

    await tx.insert(restaurants).values({
      ...restaurantInput,
      id: restaurantId,
      slug,
      logoUrl: logoAsset?.publicUrl ?? restaurantInput.logoUrl,
      banniereUrl: bannerAsset?.publicUrl ?? restaurantInput.banniereUrl,
      fraisLivraison: input.fraisLivraison ?? 0,
      commandeMinimum: input.commandeMinimum ?? 0,
      modesCommande: input.modesCommande ?? ["sur_place"],
      cuisines: input.cuisines ?? [],
      actif: false,
      ...(marketAssignment
        ? {
            serviceMarketId: marketAssignment.serviceMarketId,
            serviceMarketVersionId: marketAssignment.serviceMarketVersionId,
            geoAssignmentStatus: marketAssignment.geoAssignmentStatus,
            geoAssignedAt: marketAssignment.geoAssignedAt,
          }
        : {}),
    });

    if (schedule.length > 0) {
      await tx.insert(creneauxHoraires).values(
        schedule.map((entry) => ({
          id: crypto.randomUUID(),
          restaurantId,
          nom: entry.nom,
          heureOuverture: entry.heureOuverture,
          heureFermeture: entry.heureFermeture,
          joursActifs: entry.joursActifs,
        })),
      );
    }
    if (categoriesWithIds.length > 0) {
      await tx.insert(categories).values(categoriesWithIds);
    }
    if (menuWithIds.length > 0) {
      await tx.insert(plats).values(
        menuWithIds.map((item) => ({
          id: item.id,
          restaurantId,
          categorieId: categoriesByName.get(item.categorie.trim())!,
          nom: item.nom,
          description: item.description,
          prix: item.prix,
          photoUrl: dishAssets.get(item.id) ?? item.photoUrl,
          ordre: item.order,
          firstPublishedAt: new Date(),
        })),
      );
    }
  });
  const restaurant = await db.query.restaurants.findFirst({
    where: (table, { eq }) => eq(table.id, restaurantId),
  });
  if (!restaurant) throw new Error("Restaurant introuvable après sa création.");
  return restaurant;
}
