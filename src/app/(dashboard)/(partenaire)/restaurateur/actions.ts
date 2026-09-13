"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRestaurateurSession } from "@/app/_shared/restaurant-session";
import { geocoder } from "@/infrastructure/geocoding";
import { createLogger } from "@/infrastructure/logger";
import {
  changeRestaurantLocation,
  deleteRestaurantSchedule,
  resubmitRestaurant,
  saveRestaurantSchedule,
  setRestaurantOnline,
  setRestaurantOrderAcceptance,
  toggleRestaurantSchedule,
  updateRestaurantProfile,
} from "@/modules/restaurants/server";
import {
  openingHoursSchema,
  restaurantUpdateSchema,
  type OpeningHoursInput,
} from "@/modules/restaurants/contracts";
import {
  RestaurantDomainError,
  RestaurantMarketError,
} from "@/modules/restaurants/model";

const log = createLogger("actions-restaurant");

const restaurantGeocodingSchema = z.object({
  adresse: z.string().trim().min(3).max(500),
  ville: z.string().trim().max(120).optional(),
  pays: z.string().trim().max(120).optional(),
});

export type { OpeningHoursInput } from "@/modules/restaurants/contracts";

export async function geocodeRestaurantAddressAction(input: {
  adresse: string;
  ville?: string;
  pays?: string;
}) {
  await getRestaurateurSession();
  const parsed = restaurantGeocodingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Adresse invalide." };
  }
  const query = [parsed.data.adresse, parsed.data.ville, parsed.data.pays]
    .filter(Boolean)
    .join(", ");
  const result = await geocoder(query);
  return result
    ? { success: true as const, result }
    : { error: "Adresse introuvable. Ajustez-la ou placez le marqueur." };
}

export async function updateRestaurantAction(
  _: unknown,
  formData: FormData,
): Promise<{ error?: unknown; success?: boolean }> {
  const { session, restaurant } = await getRestaurateurSession();
  const logoAssetId = formData.get("logoAssetId");
  const bannerAssetId = formData.get("bannerAssetId");
  const raw: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    if (key === "modesCommande" || key === "cuisines") {
      const values = formData.getAll(key).map(String);
      raw[key] =
        key === "cuisines" && values.length === 1
          ? values[0]!
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : values;
      continue;
    }
    if (key !== "logoAssetId" && key !== "bannerAssetId") raw[key] = value;
  }
  for (const field of [
    "fraisLivraison",
    "commandeMinimum",
    "tempsPreparationMoyen",
    "latitude",
    "longitude",
  ]) {
    if (raw[field] !== undefined && raw[field] !== "") {
      raw[field] = Number(raw[field]);
    }
  }
  for (const nullable of [
    "description",
    "email",
    "siteWeb",
    "facebook",
    "instagram",
    "whatsapp",
    "logoUrl",
    "banniereUrl",
  ]) {
    if (raw[nullable] === "") raw[nullable] = null;
  }
  // L'ouverture et la capacité de commande ont leurs commandes dédiées.
  delete raw.enLigne;
  delete raw.accepteCommandes;

  const parsed = restaurantUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  try {
    const { adresse, latitude, longitude, ville, pays, ...profileData } =
      parsed.data;
    void ville;
    const locationChanged =
      (adresse !== undefined && adresse !== restaurant.adresse) ||
      (latitude !== undefined && latitude !== restaurant.latitude) ||
      (longitude !== undefined && longitude !== restaurant.longitude);
    if (locationChanged) {
      if (
        adresse === undefined ||
        latitude === undefined ||
        longitude === undefined
      ) {
        return {
          error: {
            _: ["L'adresse et ses coordonnées doivent être modifiées ensemble."],
          },
        };
      }
      await changeRestaurantLocation({
        restaurantId: restaurant.id,
        adresse,
        latitude,
        longitude,
        pays: pays || undefined,
      });
    }
    await updateRestaurantProfile(restaurant.id, profileData, {
      ownerUserId: session.userId,
      logoAssetId:
        typeof logoAssetId === "string" && logoAssetId
          ? logoAssetId
          : undefined,
      bannerAssetId:
        typeof bannerAssetId === "string" && bannerAssetId
          ? bannerAssetId
          : undefined,
    });
  } catch (error) {
    log.error({ error, restaurantId: restaurant.id }, "update profile failed");
    return {
      error: {
        _: [
          error instanceof RestaurantMarketError ? error.message : "Impossible de mettre à jour le profil.",
        ],
      },
    };
  }

  revalidatePath("/restaurateur/profil");
  revalidatePath("/restaurateur");
  return { success: true };
}

export async function resoumettreRestaurantAction() {
  const { session, restaurant } = await getRestaurateurSession();
  if (restaurant.actif || restaurant.suspendu || !restaurant.motifRejet) {
    return { error: "Seul un dossier refusé peut être renvoyé pour validation." };
  }
  try {
    const updated = await resubmitRestaurant(restaurant.id, session.userId);
    if (!updated) return { error: "Le dossier a déjà été renvoyé." };
  } catch (error) {
    log.error({ error, restaurantId: restaurant.id }, "resubmit failed");
    return { error: "Impossible de renvoyer le dossier pour le moment." };
  }
  for (const path of [
    "/restaurateur",
    "/restaurateur/profil",
    "/restaurateur/facturation",
    "/admin",
    "/admin/a-traiter",
    "/admin/restaurants",
  ]) {
    revalidatePath(path);
  }
  return { success: true as const };
}

export async function setRestaurantOnlineAction(enLigne: boolean) {
  const { restaurant } = await getRestaurateurSession();
  try {
    const updated = await setRestaurantOnline(restaurant.id, enLigne);
    revalidatePath("/restaurateur/profil");
    revalidatePath("/restaurateur");
    return {
      success: true as const,
      enLigne: updated?.enLigne ?? enLigne,
      accepteCommandes:
        updated?.accepteCommandes ?? restaurant.accepteCommandes,
    };
  } catch (error) {
    log.error({ error, restaurantId: restaurant.id }, "online state failed");
    return { error: "Impossible de modifier l’ouverture du restaurant." };
  }
}

export async function setRestaurantOrderAcceptanceAction(
  accepteCommandes: boolean,
) {
  const { restaurant } = await getRestaurateurSession();
  try {
    await setRestaurantOrderAcceptance(restaurant.id, accepteCommandes);
    revalidatePath("/restaurateur/profil");
    revalidatePath("/restaurateur");
    return { success: true as const, accepteCommandes };
  } catch (error) {
    log.error({ error, restaurantId: restaurant.id }, "order capacity failed");
    return {
      error:
        error instanceof RestaurantDomainError
          ? error.message
          : "Impossible de modifier l’acceptation des commandes.",
    };
  }
}

export async function saveOpeningHoursAction(input: OpeningHoursInput) {
  const { restaurant } = await getRestaurateurSession();
  const parsed = openingHoursSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Créneau invalide." };
  }
  try {
    const creneau = await saveRestaurantSchedule(restaurant.id, parsed.data);
    if (!creneau) return { error: "Créneau introuvable." };
    revalidatePath("/restaurateur/profil");
    return { success: true as const, creneau };
  } catch (error) {
    log.error({ error, restaurantId: restaurant.id }, "save schedule failed");
    return { error: "Impossible d’enregistrer ce créneau." };
  }
}

export async function toggleOpeningHoursAction(id: string, actif: boolean) {
  const { restaurant } = await getRestaurateurSession();
  try {
    const creneau = await toggleRestaurantSchedule(restaurant.id, id, actif);
    if (!creneau) return { error: "Créneau introuvable." };
    revalidatePath("/restaurateur/profil");
    return { success: true as const };
  } catch (error) {
    log.error({ error, restaurantId: restaurant.id }, "toggle schedule failed");
    return { error: "Impossible de modifier ce créneau." };
  }
}

export async function deleteOpeningHoursAction(id: string) {
  const { restaurant } = await getRestaurateurSession();
  try {
    const rows = await deleteRestaurantSchedule(restaurant.id, id);
    if (rows.length === 0) return { error: "Créneau introuvable." };
    revalidatePath("/restaurateur/profil");
    return { success: true as const };
  } catch (error) {
    log.error({ error, restaurantId: restaurant.id }, "delete schedule failed");
    return { error: "Impossible de supprimer ce créneau." };
  }
}
