"use server";

import { getRestaurateurSession } from "@/lib/auth/get-restaurateur-session";
import { updateRestaurant } from "@/lib/db/mutations";
import { createLogger } from "@/lib/logger";
import { restaurantUpdateSchema } from "@/lib/validations/restaurant";
import { revalidatePath } from "next/cache";
import { invalidateRestaurantCache } from "@/lib/cache";

const log = createLogger("actions-restaurant");

export async function updateRestaurantAction(
  _: unknown,
  formData: FormData,
): Promise<{ error?: unknown; success?: boolean }> {
  const { restaurant } = await getRestaurateurSession();

  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key === "modesCommande") {
      raw[key] = formData.getAll("modesCommande").map((item) => String(item));
      continue;
    }
    if (key === "cuisines") {
      const all = formData.getAll("cuisines").map((item) => String(item));
      // Si un seul champ CSV est envoyé, split par virgule
      if (all.length === 1 && all[0].includes(",")) {
        raw[key] = all[0]
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      } else {
        raw[key] = all;
      }
      continue;
    }

    raw[key] = value;
  }

  for (const field of [
    "fraisLivraison",
    "commandeMinimum",
    "tempsPreparationMoyen",
    "latitude",
    "longitude",
  ]) {
    const value = raw[field];
    if (value !== undefined && value !== null && value !== "") {
      raw[field] = Number(value);
    }
  }

  raw.accepteCommandes = formData.get("accepteCommandes") === "on";
  raw.enLigne = formData.get("enLigne") === "on";

  const parsed = restaurantUpdateSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  try {
    await updateRestaurant(restaurant.id, parsed.data);
    await invalidateRestaurantCache(restaurant.id, restaurant.slug);
  } catch (error) {
    log.error(
      { error, restaurantId: restaurant.id },
      "[updateRestaurant] error",
    );
    return { error: { _: ["Impossible de mettre à jour le profil"] } };
  }

  revalidatePath("/restaurateur/profil");
  revalidatePath("/restaurateur");

  return { success: true };
}
