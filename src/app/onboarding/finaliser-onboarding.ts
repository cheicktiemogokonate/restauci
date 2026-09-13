"use server";

import { getCurrentUser } from "@/modules/auth/server";
import {
  createRestaurant,
  getRestaurantByPartnerAccountId,
} from "@/modules/restaurants/server";
import { getInitialMenuCategories } from "@/modules/menu/model";
import { getEffectiveRestaurantQuota } from "@/modules/quotas/server";
import { createLogger } from "@/infrastructure/logger";
import { RESTAURANT_TYPE_OPTIONS } from "@/modules/restaurants/presentation/onboarding-settings";
import {
  restaurantCreationSchema,
  type RestaurantOnboardingData,
  type ServiceTypeInput,
} from "@/modules/restaurants/contracts";
import { redirect } from "next/navigation";
import { requirePartnerActivity } from "@/modules/partners/server";
import {
  RestaurantDomainError,
  RestaurantMarketError,
} from "@/modules/restaurants/model";

const log = createLogger("actions-onboarding");

const normalizeMode = (mode: ServiceTypeInput) => {
  if (mode === "dine-in" || mode === "sur_place") return "sur_place";
  if (mode === "takeout" || mode === "emporter") return "emporter";
  if (mode === "delivery" || mode === "livraison") return "livraison";
  return mode;
};

export async function finaliserOnboarding(data: RestaurantOnboardingData) {
  // 1. Vérifier la session
  const session = await getCurrentUser();
  if (!session) redirect("/login");
  const partnerAccount = await requirePartnerActivity("restaurant");

  // 2. Vérifier qu'un restaurant n'existe pas déjà
  const hasRestaurant = await getRestaurantByPartnerAccountId(partnerAccount.id);
  if (hasRestaurant) {
    redirect("/restaurateur");
  }

  const allowedEstablishmentCategories = new Set<string>(
    RESTAURANT_TYPE_OPTIONS.map((category) => category.id),
  );
  if (data.establishmentType !== "restaurant") {
    return {
      error:
        "La création des résidences et des événements sera disponible prochainement.",
    };
  }
  if (
    data.cuisines?.length !== 1 ||
    !allowedEstablishmentCategories.has(data.cuisines[0])
  ) {
    return { error: "Choisissez un type d’établissement valide." };
  }

  const normalizedModes = data.modesCommande.map(normalizeMode);
  const parsed = restaurantCreationSchema.safeParse({
    ...data,
    modesCommande: normalizedModes,
  });
  if (!parsed.success) {
    return { error: "Données invalides" };
  }

  const mappedModes = parsed.data.modesCommande;
  const dayCodes: Record<string, string> = {
    lundi: "lun",
    mardi: "mar",
    mercredi: "mer",
    jeudi: "jeu",
    vendredi: "ven",
    samedi: "sam",
    dimanche: "dim",
  };

  const schedule = data.schedule
    .filter((entry) => entry.isOpen)
    .map((entry) => ({
      nom: entry.day,
      heureOuverture: entry.openTime,
      heureFermeture: entry.closeTime,
      joursActifs: [dayCodes[entry.day.toLowerCase()]],
    }))
    .filter((entry) => Boolean(entry.joursActifs[0]));

  const menu = data.menu
    .map((item) => ({
      nom: item.name.trim(),
      description: item.description.trim() || undefined,
      prix: item.price,
      categorie: item.category.trim(),
      photoUrl: item.photoUrl || undefined,
      photoAssetId: item.photoAssetId || undefined,
    }))
    .filter(
      (item) =>
        item.nom.length >= 2 &&
        item.categorie.length >= 2 &&
        Number.isInteger(item.prix) &&
        item.prix > 0,
    );

  // 3. Créer le restaurant en DB
  try {
    const entitlement = await getEffectiveRestaurantQuota(partnerAccount.id);
    await createRestaurant({
      partnerAccountId: partnerAccount.id,
      nom: parsed.data.nom,
      telephone: parsed.data.telephone,
      adresse: parsed.data.adresse,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      modesCommande: mappedModes,
      cuisines: parsed.data.cuisines,
      description: parsed.data.description,
      logoUrl: parsed.data.logoUrl,
      logoAssetId: data.logoAssetId,
      banniereUrl: parsed.data.banniereUrl,
      banniereAssetId: data.banniereAssetId,
      pays: parsed.data.pays,
      ville: parsed.data.ville,
      email: parsed.data.email,
      siteWeb: parsed.data.siteWeb,
      whatsapp: parsed.data.whatsapp || undefined,
      facebook: parsed.data.facebook || undefined,
      schedule,
      menu,
    }, {
      initialCategoryNames: getInitialMenuCategories(entitlement.limits.category),
      dishLimit: entitlement.limits.dish,
      planCode: entitlement.planCode,
    });
  } catch (error) {
    log.error({ error, userId: session.userId }, "finaliserOnboarding error");
    if (error instanceof RestaurantMarketError) {
      return { error: error.message };
    }
    if (error instanceof RestaurantDomainError) {
      return { error: error.message };
    }
    return { error: "Impossible de créer le restaurant. Réessaye." };
  }

  // 4. Rediriger vers le dashboard
  redirect("/restaurateur");
}
