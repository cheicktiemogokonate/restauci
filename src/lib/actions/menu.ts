"use server";

import { getRestaurateurSession } from "@/lib/auth/get-restaurateur-session";
import { db } from "@/lib/db";
import {
  createCategorie,
  createPlat,
  deletePlat,
  toggleDisponibilitePlat,
  updateCategorie,
  updatePlat,
} from "@/lib/db/mutations";
import { categories } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { SubscriptionLimitError } from "@/lib/subscription-plans";
import { platSchema, updatePlatSchema } from "@/lib/validations/plat";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const log = createLogger("actions-menu");

const platWizardSchema = z
  .object({
    nom: z.string().trim().min(1, "Le nom du plat est requis"),
    description: z.string().trim().optional(),
    prix: z.string().trim().min(1, "Le prix est requis"),
    image: z.union([z.string().url(), z.null()]),
    categorieId: z.string().uuid().optional(),
    newCategorieName: z.string().trim().min(2).optional(),
    disponible: z.boolean(),
  })
  .refine((data) => data.categorieId || data.newCategorieName, {
    message: "La catégorie est requise",
  });

function parsePrix(prix: string): number | null {
  const cleaned = prix.replace(/\s/g, "").replace(/[^\d]/g, "");
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

export type CreatePlatWizardInput = z.infer<typeof platWizardSchema>;

const categoryNameSchema = z
  .string()
  .trim()
  .min(2, "Le nom doit contenir au moins 2 caractères.")
  .max(255, "Le nom est trop long.");

async function getRestaurantCategory(categoryId: string, restaurantId: string) {
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(
        eq(categories.id, categoryId),
        eq(categories.restaurantId, restaurantId),
      ),
    )
    .limit(1);

  return category;
}

export async function createMenuCategoryAction(name: string) {
  const { restaurant } = await getRestaurateurSession();
  const parsed = categoryNameSchema.safeParse(name);

  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    const [existingCategory] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.restaurantId, restaurant.id),
          eq(categories.nom, parsed.data),
        ),
      )
      .limit(1);

    if (existingCategory) {
      return { error: "Une catégorie porte déjà ce nom." };
    }

    const category = await createCategorie({
      restaurantId: restaurant.id,
      nom: parsed.data,
    });

    if (!category) {
      return { error: "Impossible de créer la catégorie. Réessayez." };
    }

    revalidatePath("/restaurateur/menu");
    return {
      success: true,
      category: { id: category.id, nom: category.nom },
    };
  } catch (error) {
    log.error(
      { error, restaurantId: restaurant.id },
      "createMenuCategoryAction error",
    );
    return {
      error:
        error instanceof SubscriptionLimitError
          ? error.message
          : "Impossible de créer la catégorie. Réessayez.",
    };
  }
}

export async function renameMenuCategoryAction(categoryId: string, name: string) {
  const { restaurant } = await getRestaurateurSession();
  const parsed = categoryNameSchema.safeParse(name);

  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!categoryId) return { error: "Catégorie introuvable." };

  try {
    const category = await getRestaurantCategory(categoryId, restaurant.id);
    if (!category) return { error: "Catégorie introuvable." };

    const [sameNameCategory] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.restaurantId, restaurant.id),
          eq(categories.nom, parsed.data),
        ),
      )
      .limit(1);

    if (sameNameCategory && sameNameCategory.id !== categoryId) {
      return { error: "Une catégorie porte déjà ce nom." };
    }

    await updateCategorie(categoryId, restaurant.id, { nom: parsed.data });
  } catch (error) {
    log.error(
      { error, categoryId, restaurantId: restaurant.id },
      "renameMenuCategoryAction error",
    );
    return { error: "Impossible de renommer la catégorie. Réessayez." };
  }

  revalidatePath("/restaurateur/menu");
  return { success: true };
}

export async function createPlatWizardAction(data: CreatePlatWizardInput) {
  const { restaurant } = await getRestaurateurSession();

  const parsed = platWizardSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Données invalides. Vérifiez les champs obligatoires." };
  }

  const { nom, description, image, prix: prixRaw, disponible } = parsed.data;
  const prix = parsePrix(prixRaw);
  if (prix === null) {
    return { error: "Prix invalide." };
  }

  try {
    let categorieId = parsed.data.categorieId;

    if (!categorieId && parsed.data.newCategorieName) {
      const [existingCategory] = await db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.restaurantId, restaurant.id),
            eq(categories.nom, parsed.data.newCategorieName),
          ),
        )
        .limit(1);

      if (existingCategory) {
        categorieId = existingCategory.id;
      } else {
        const categorie = await createCategorie({
          restaurantId: restaurant.id,
          nom: parsed.data.newCategorieName,
        });
        categorieId = categorie.id;
      }
    }

    if (!categorieId) {
      return { error: "Catégorie introuvable." };
    }

    const [category] = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, categorieId),
          eq(categories.restaurantId, restaurant.id),
        ),
      )
      .limit(1);

    if (!category) {
      return { error: "Catégorie invalide." };
    }

    await createPlat({
      restaurantId: restaurant.id,
      categorieId,
      nom,
      description: description || undefined,
      prix,
      photoUrl: image,
      disponible,
    });
  } catch (error) {
    log.error(
      { error, restaurantId: restaurant.id },
      "createPlatWizardAction error",
    );
    return {
      error:
        error instanceof SubscriptionLimitError
          ? error.message
          : "Impossible d'ajouter le plat. Réessayez.",
    };
  }

  revalidatePath("/restaurateur/menu");
  redirect("/restaurateur/menu");
}

export async function createPlatAction(_: unknown, formData: FormData) {
  const { restaurant } = await getRestaurateurSession();

  const rawData = {
    nom: formData.get("nom") as string,
    description: formData.get("description") as string,
    prix: Number(formData.get("prix")),
    categorieId: formData.get("categorieId") as string,
    disponible: formData.get("disponible") === "true",
    image: formData.get("photoUrl") as string,
  };

  const parsed = platSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: "Données invalides" };
  }

  let tags: string[] | undefined = undefined;
  const tagsRaw = formData.get("tags") as string;
  if (tagsRaw) {
    try {
      tags = JSON.parse(tagsRaw);
      if (!Array.isArray(tags)) tags = undefined;
    } catch {
      tags = tagsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  try {
    await createPlat({
      restaurantId: restaurant.id,
      categorieId: parsed.data.categorieId,
      nom: parsed.data.nom.trim(),
      description: parsed.data.description,
      prix: parsed.data.prix,
      disponible: parsed.data.disponible,
      photoUrl: parsed.data.image,
      tags,
    });
  } catch (error) {
    log.error({ error, restaurantId: restaurant.id }, "createPlatAction error");
    return {
      error:
        error instanceof SubscriptionLimitError
          ? error.message
          : "Une erreur est survenue",
    };
  }

  revalidatePath("/restaurateur/menu");
  return { success: true };
}

export async function deletePlatAction(platId: string) {
  const { restaurant } = await getRestaurateurSession();

  if (!platId) {
    return { error: "Identifiant du plat invalide." };
  }

  try {
    const deletedPlats = await deletePlat(platId, restaurant.id);
    if (deletedPlats.length === 0) {
      return { error: "Ce plat est introuvable ou a déjà été supprimé." };
    }
  } catch (error) {
    log.error(
      { error, platId, restaurantId: restaurant.id },
      "deletePlatAction error",
    );
    return { error: "Impossible de supprimer le plat. Réessayez." };
  }

  revalidatePath("/restaurateur/menu");
  return { success: true };
}

export async function updatePlatAction(data: z.infer<typeof updatePlatSchema>) {
  const { restaurant } = await getRestaurateurSession();

  const parsed = updatePlatSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Données invalides. Vérifiez les champs obligatoires." };
  }

  const {
    platId,
    nom,
    description,
    photoUrl,
    categorieId,
    disponible,
    prix: prixRaw,
  } = parsed.data;
  const prix = parsePrix(prixRaw);
  if (prix === null) {
    return { error: "Prix invalide." };
  }

  const [category] = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.id, categorieId),
        eq(categories.restaurantId, restaurant.id),
      ),
    )
    .limit(1);

  if (!category) {
    return { error: "Catégorie invalide." };
  }

  try {
    await updatePlat(platId, restaurant.id, {
      nom,
      description: description || undefined,
      prix,
      photoUrl: photoUrl ?? null,
      categorieId,
      disponible,
    });
  } catch (error) {
    log.error(
      { error, platId, restaurantId: restaurant.id },
      "updatePlatAction error",
    );
    return { error: "Impossible de modifier le plat. Réessayez." };
  }

  revalidatePath("/restaurateur/menu");
  revalidatePath(`/restaurateur/menu/${platId}`);
  return { success: true };
}

/**
 * Bascule la disponibilité d'un plat (disponible ↔ indisponible).
 * Utilisé avec useOptimistic dans MenuCard pour une mise à jour immédiate de l'UI.
 */
export async function toggleDisponibilitePlatAction(
  platId: string,
  disponible: boolean,
) {
  const { restaurant } = await getRestaurateurSession();

  if (!platId || typeof disponible !== "boolean") {
    return { error: "Données invalides" };
  }

  try {
    await toggleDisponibilitePlat(platId, restaurant.id, disponible);
  } catch (error) {
    log.error(
      { error, platId, disponible, restaurantId: restaurant.id },
      "toggleDisponibilitePlatAction error",
    );
    return { error: "Impossible de modifier la disponibilité" };
  }

  revalidatePath("/restaurateur/menu");
  return { success: true };
}
