"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getRestaurateurSession } from "@/app/_shared/restaurant-session";
import { createLogger } from "@/infrastructure/logger";
import { parseMontantFcfa } from "@/shared/money";
import {
  createMenuCategory,
  createMenuDish,
  deleteMenuDish,
  renameMenuCategory,
  setMenuCategoryPublication,
  setMenuDishAvailability,
  setMenuDishPublication,
  updateMenuDish,
} from "@/modules/menu/server";
import { menuCategoryNameSchema } from "@/modules/menu/contracts";
import { MenuDomainError } from "@/modules/menu/model";

const log = createLogger("actions-menu");

const dishWizardSchema = z
  .object({
    nom: z.string().trim().min(2, "Le nom du plat est requis"),
    description: z.string().trim().max(2_000).optional(),
    prix: z.string().trim().min(1, "Le prix est requis"),
    image: z.string().url().nullable(),
    imageAssetId: z.string().uuid().nullable().optional(),
    categorieId: z.string().uuid().optional(),
    newCategorieName: menuCategoryNameSchema.optional(),
    disponible: z.boolean(),
  })
  .strict()
  .refine((data) => data.categorieId || data.newCategorieName, {
    message: "La catégorie est requise",
  });

const updateDishTransportSchema = z
  .object({
    platId: z.string().uuid(),
    nom: z.string().trim().min(2, "Le nom du plat est requis"),
    description: z.string().trim().max(2_000).optional(),
    prix: z.string().trim().min(1, "Le prix est requis"),
    photoUrl: z.string().url().nullable().optional(),
    photoAssetId: z.string().uuid().optional(),
    categorieId: z.string().uuid("Catégorie invalide"),
    disponible: z.boolean(),
  })
  .strict();

export type CreatePlatWizardInput = z.infer<typeof dishWizardSchema>;

function menuActionError(error: unknown, fallback: string) {
  if (error instanceof MenuDomainError || error instanceof z.ZodError) {
    return error instanceof z.ZodError
      ? (error.issues[0]?.message ?? fallback)
      : error.message;
  }
  return fallback;
}

export async function createMenuCategoryAction(name: string) {
  const { restaurant } = await getRestaurateurSession();
  try {
    const category = await createMenuCategory(restaurant.id, name);
    revalidatePath("/restaurateur/menu");
    return {
      success: true as const,
      category: { id: category.id, nom: category.nom },
    };
  } catch (error) {
    log.error({ error, restaurantId: restaurant.id }, "create category failed");
    return {
      success: false as const,
      error: menuActionError(error, "Impossible de créer la catégorie."),
    };
  }
}

export async function renameMenuCategoryAction(
  categoryId: string,
  name: string,
) {
  const { restaurant } = await getRestaurateurSession();
  try {
    await renameMenuCategory(restaurant.id, categoryId, name);
    revalidatePath("/restaurateur/menu");
    return { success: true as const };
  } catch (error) {
    log.error(
      { error, categoryId, restaurantId: restaurant.id },
      "rename category failed",
    );
    return {
      success: false as const,
      error: menuActionError(error, "Impossible de renommer la catégorie."),
    };
  }
}

export async function createPlatWizardAction(data: CreatePlatWizardInput) {
  const { session, restaurant } = await getRestaurateurSession();
  const parsed = dishWizardSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const prix = parseMontantFcfa(parsed.data.prix);
  if (prix === null) return { error: "Prix invalide." };

  try {
    await createMenuDish({
      restaurantId: restaurant.id,
      ownerUserId: session.userId,
      nom: parsed.data.nom,
      description: parsed.data.description,
      prix,
      photoUrl: parsed.data.image,
      photoAssetId: parsed.data.imageAssetId ?? undefined,
      categorieId: parsed.data.categorieId,
      newCategorieName: parsed.data.newCategorieName,
      disponible: parsed.data.disponible,
      ordre: 0,
      tags: [],
      allergenes: [],
    });
  } catch (error) {
    log.error({ error, restaurantId: restaurant.id }, "create dish failed");
    return { error: menuActionError(error, "Impossible d’ajouter le plat.") };
  }

  revalidatePath("/restaurateur/menu");
  redirect("/restaurateur/menu");
}

export async function createPlatAction(_: unknown, formData: FormData) {
  const tagsRaw = String(formData.get("tags") ?? "");
  let tags: string[] = [];
  if (tagsRaw) {
    try {
      const parsed = JSON.parse(tagsRaw) as unknown;
      tags = Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      tags = tagsRaw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  const { session, restaurant } = await getRestaurateurSession();
  try {
    await createMenuDish({
      restaurantId: restaurant.id,
      ownerUserId: session.userId,
      nom: String(formData.get("nom") ?? ""),
      description: String(formData.get("description") ?? "") || undefined,
      prix: Number(formData.get("prix")),
      categorieId: String(formData.get("categorieId") ?? ""),
      disponible: formData.get("disponible") === "true",
      photoUrl: String(formData.get("photoUrl") ?? "") || null,
      photoAssetId: String(formData.get("photoAssetId") ?? "") || undefined,
      ordre: 0,
      tags,
      allergenes: [],
    });
    revalidatePath("/restaurateur/menu");
    return { success: true as const };
  } catch (error) {
    log.error({ error, restaurantId: restaurant.id }, "create dish failed");
    return { error: menuActionError(error, "Impossible d’ajouter le plat.") };
  }
}

export async function deletePlatAction(platId: string) {
  const { restaurant } = await getRestaurateurSession();
  try {
    const deleted = await deleteMenuDish(platId, restaurant.id);
    if (deleted.length === 0) {
      return { error: "Ce plat est introuvable ou déjà supprimé." };
    }
    revalidatePath("/restaurateur/menu");
    return { success: true as const };
  } catch (error) {
    log.error({ error, platId, restaurantId: restaurant.id }, "delete dish failed");
    return { error: menuActionError(error, "Impossible de supprimer le plat.") };
  }
}

export async function updatePlatAction(
  data: z.infer<typeof updateDishTransportSchema>,
) {
  const { session, restaurant } = await getRestaurateurSession();
  const parsed = updateDishTransportSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }
  const prix = parseMontantFcfa(parsed.data.prix);
  if (prix === null) return { error: "Prix invalide." };
  try {
    await updateMenuDish({
      restaurantId: restaurant.id,
      ownerUserId: session.userId,
      dishId: parsed.data.platId,
      nom: parsed.data.nom,
      description: parsed.data.description,
      prix,
      photoUrl: parsed.data.photoUrl,
      photoAssetId: parsed.data.photoAssetId,
      categorieId: parsed.data.categorieId,
      disponible: parsed.data.disponible,
    });
    revalidatePath("/restaurateur/menu");
    revalidatePath(`/restaurateur/menu/${parsed.data.platId}`);
    return { success: true as const };
  } catch (error) {
    log.error(
      { error, platId: parsed.data.platId, restaurantId: restaurant.id },
      "update dish failed",
    );
    return { error: menuActionError(error, "Impossible de modifier le plat.") };
  }
}

export async function toggleDisponibilitePlatAction(
  platId: string,
  disponible: boolean,
) {
  const { restaurant } = await getRestaurateurSession();
  try {
    const dish = await setMenuDishAvailability(
      platId,
      restaurant.id,
      disponible,
    );
    if (!dish) return { error: "Plat introuvable." };
    revalidatePath("/restaurateur/menu");
    return { success: true as const };
  } catch (error) {
    log.error({ error, platId, restaurantId: restaurant.id }, "availability failed");
    return { error: menuActionError(error, "Impossible de modifier la disponibilité.") };
  }
}

export async function setCategoryPublicationAction(
  categoryId: string,
  publicationIntent: boolean,
) {
  const { restaurant } = await getRestaurateurSession();
  try {
    const category = await setMenuCategoryPublication(
      restaurant.id,
      categoryId,
      publicationIntent,
    );
    if (!category) return { error: "Catégorie introuvable." };
    revalidatePath("/restaurateur/menu");
    return { success: true as const };
  } catch (error) {
    return { error: menuActionError(error, "Impossible de modifier la publication.") };
  }
}

export async function setDishPublicationAction(
  platId: string,
  publicationIntent: boolean,
) {
  const { restaurant } = await getRestaurateurSession();
  try {
    const dish = await setMenuDishPublication(
      platId,
      restaurant.id,
      publicationIntent,
    );
    if (!dish) return { error: "Plat introuvable." };
    revalidatePath("/restaurateur/menu");
    revalidatePath(`/restaurateur/menu/${platId}`);
    return { success: true as const };
  } catch (error) {
    return { error: menuActionError(error, "Impossible de modifier la publication.") };
  }
}
