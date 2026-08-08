"use server";

import { getRestaurateurSession } from "@/lib/auth/get-restaurateur-session";
import {
  createCreneau,
  deleteCreneau,
  resoumettreRestaurant,
  updateCreneau,
  updateRestaurant,
} from "@/lib/db/mutations";
import { createLogger } from "@/lib/logger";
import { restaurantUpdateSchema } from "@/lib/validations/restaurant";
import { revalidatePath } from "next/cache";
import { invalidateRestaurantCache } from "@/lib/cache";
import { geocoder } from "@/lib/geo";
import { z } from "zod";

const log = createLogger("actions-restaurant");

const openingHoursSchema = z
  .object({
    id: z.string().uuid().optional(),
    nom: z.string().trim().min(2, "Donnez un nom à ce créneau.").max(255),
    heureOuverture: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure d'ouverture invalide."),
    heureFermeture: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure de fermeture invalide."),
    joursActifs: z.array(z.enum(["lun", "mar", "mer", "jeu", "ven", "sam", "dim"])).min(1, "Choisissez au moins un jour."),
    actif: z.boolean(),
  });

export type OpeningHoursInput = z.infer<typeof openingHoursSchema>;

const restaurantGeocodingSchema = z.object({
  adresse: z.string().trim().min(3, "Saisissez au moins 3 caractères d'adresse.").max(500),
  ville: z.string().trim().max(120).optional(),
  pays: z.string().trim().max(120).optional(),
});

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
  if (!result) {
    return { error: "Adresse introuvable. Ajustez-la ou placez le marqueur sur la carte." };
  }

  return { success: true, result };
}

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

  if (formData.has("accepteCommandes")) {
    raw.accepteCommandes = formData.get("accepteCommandes") === "on";
  }
  if (formData.has("enLigne")) {
    raw.enLigne = formData.get("enLigne") === "on";
  }

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

export async function resoumettreRestaurantAction() {
  const { session, restaurant } = await getRestaurateurSession();

  if (restaurant.actif || restaurant.suspendu || !restaurant.motifRejet) {
    return { error: "Seul un dossier refusé peut être renvoyé pour validation." };
  }

  try {
    const updated = await resoumettreRestaurant(
      restaurant.id,
      session.userId as string,
    );
    if (!updated) {
      return { error: "Ce dossier a déjà été renvoyé ou son état a changé." };
    }
  } catch (error) {
    log.error(
      { error, restaurantId: restaurant.id },
      "resoumettreRestaurantAction error",
    );
    return { error: "Impossible de renvoyer le dossier pour le moment." };
  }

  revalidatePath("/restaurateur");
  revalidatePath("/restaurateur/profil");
  revalidatePath("/restaurateur/facturation");
  revalidatePath("/admin");
  revalidatePath("/admin/a-traiter");
  revalidatePath("/admin/restaurants");
  return { success: true } as const;
}

export async function setRestaurantOnlineAction(enLigne: boolean) {
  const { restaurant } = await getRestaurateurSession();

  if (typeof enLigne !== "boolean") {
    return { error: "État du restaurant invalide." };
  }

  try {
    await updateRestaurant(restaurant.id, {
      enLigne,
      // Un restaurant hors ligne ne doit jamais recevoir de commande.
      // Le retour en ligne restaure un service immédiatement utilisable.
      accepteCommandes: enLigne,
    });
    await invalidateRestaurantCache(restaurant.id, restaurant.slug);
  } catch (error) {
    log.error(
      { error, restaurantId: restaurant.id, enLigne },
      "setRestaurantOnlineAction error",
    );
    return { error: "Impossible de modifier l'état du service." };
  }

  revalidatePath("/restaurateur/profil");
  revalidatePath("/restaurateur");
  return { success: true, enLigne, accepteCommandes: enLigne };
}

export async function setRestaurantOrderAcceptanceAction(
  accepteCommandes: boolean,
) {
  const { restaurant } = await getRestaurateurSession();

  if (typeof accepteCommandes !== "boolean") {
    return { error: "État des commandes invalide." };
  }
  if (!restaurant.enLigne && accepteCommandes) {
    return { error: "Remettez le restaurant en ligne avant d'accepter des commandes." };
  }

  try {
    await updateRestaurant(restaurant.id, { accepteCommandes });
    await invalidateRestaurantCache(restaurant.id, restaurant.slug);
  } catch (error) {
    log.error(
      { error, restaurantId: restaurant.id, accepteCommandes },
      "setRestaurantOrderAcceptanceAction error",
    );
    return { error: "Impossible de modifier l'acceptation des commandes." };
  }

  revalidatePath("/restaurateur/profil");
  revalidatePath("/restaurateur");
  return { success: true, accepteCommandes };
}

export async function saveOpeningHoursAction(input: OpeningHoursInput) {
  const { restaurant } = await getRestaurateurSession();
  const parsed = openingHoursSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Créneau invalide." };
  }

  try {
    const { id, ...data } = parsed.data;
    const creneau = id
      ? await updateCreneau(id, restaurant.id, data)
      : await createCreneau({ restaurantId: restaurant.id, ...data });

    if (!creneau) return { error: "Créneau introuvable." };

    await invalidateRestaurantCache(restaurant.id, restaurant.slug);
    revalidatePath("/restaurateur/profil");
    return { success: true, creneau };
  } catch (error) {
    log.error({ error, restaurantId: restaurant.id }, "saveOpeningHoursAction error");
    return { error: "Impossible d'enregistrer ce créneau." };
  }
}

export async function toggleOpeningHoursAction(id: string, actif: boolean) {
  const { restaurant } = await getRestaurateurSession();
  if (!id || typeof actif !== "boolean") return { error: "État du créneau invalide." };

  try {
    const creneau = await updateCreneau(id, restaurant.id, { actif });
    if (!creneau) return { error: "Créneau introuvable." };

    await invalidateRestaurantCache(restaurant.id, restaurant.slug);
    revalidatePath("/restaurateur/profil");
    return { success: true };
  } catch (error) {
    log.error({ error, restaurantId: restaurant.id, creneauId: id }, "toggleOpeningHoursAction error");
    return { error: "Impossible de modifier ce créneau." };
  }
}

export async function deleteOpeningHoursAction(id: string) {
  const { restaurant } = await getRestaurateurSession();
  if (!id) return { error: "Créneau introuvable." };

  try {
    const deletedCreneaux = await deleteCreneau(id, restaurant.id);
    if (deletedCreneaux.length === 0) return { error: "Créneau introuvable." };

    await invalidateRestaurantCache(restaurant.id, restaurant.slug);
    revalidatePath("/restaurateur/profil");
    return { success: true };
  } catch (error) {
    log.error({ error, restaurantId: restaurant.id, creneauId: id }, "deleteOpeningHoursAction error");
    return { error: "Impossible de supprimer ce créneau." };
  }
}
