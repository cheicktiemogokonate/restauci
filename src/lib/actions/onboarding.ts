"use server";

import { getCurrentUser } from "@/lib/auth";
import { createRestaurant } from "@/lib/db/mutations";
import { getMyRestaurant } from "@/lib/db/queries";
import { createLogger } from "@/lib/logger";
import { RESTAURANT_TYPE_OPTIONS } from "@/lib/onboarding/settings";
import { SubscriptionLimitError } from "@/lib/subscription-plans";
import { restaurantSchema } from "@/lib/validations/restaurant";
import { redirect } from "next/navigation";

const log = createLogger("actions-onboarding");

export type ServiceTypeInput =
  | "dine-in"
  | "takeout"
  | "delivery"
  | "sur_place"
  | "livraison"
  | "emporter";

export interface OnboardingData {
  nom: string;
  telephone: string;
  adresse: string;
  latitude: number;
  longitude: number;
  modesCommande: ServiceTypeInput[];
  establishmentType: "restaurant" | "residence" | "event";
  cuisines?: string[];
  description?: string;
  logoUrl?: string;
  banniereUrl?: string;
  pays?: string;
  ville?: string;
  email?: string;
  siteWeb?: string;
  whatsapp?: string;
  facebook?: string;
  schedule: {
    day: string;
    isOpen: boolean;
    openTime: string;
    closeTime: string;
  }[];
  menu: {
    name: string;
    description: string;
    price: number;
    category: string;
    photoUrl?: string | null;
  }[];
}

const normalizeMode = (mode: ServiceTypeInput) => {
  if (mode === "dine-in" || mode === "sur_place") return "sur_place";
  if (mode === "takeout" || mode === "emporter") return "emporter";
  if (mode === "delivery" || mode === "livraison") return "livraison";
  return mode;
};

export async function finaliserOnboarding(data: OnboardingData) {
  // 1. Vérifier la session
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  // 2. Vérifier qu'un restaurant n'existe pas déjà
  const hasRestaurant = await getMyRestaurant(session.userId);
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
  const parsed = restaurantSchema.safeParse({
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
    await createRestaurant({
      userId: session.userId,
      nom: parsed.data.nom,
      telephone: parsed.data.telephone,
      adresse: parsed.data.adresse,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      modesCommande: mappedModes,
      cuisines: parsed.data.cuisines,
      description: parsed.data.description,
      logoUrl: parsed.data.logoUrl,
      banniereUrl: parsed.data.banniereUrl,
      pays: parsed.data.pays,
      ville: parsed.data.ville,
      email: parsed.data.email,
      siteWeb: parsed.data.siteWeb,
      whatsapp: parsed.data.whatsapp || undefined,
      facebook: parsed.data.facebook || undefined,
      schedule,
      menu,
    });
  } catch (error) {
    log.error({ error, userId: session.userId }, "finaliserOnboarding error");
    if (error instanceof SubscriptionLimitError) {
      return { error: error.message };
    }
    return { error: "Impossible de créer le restaurant. Réessaye." };
  }

  // 4. Rediriger vers le dashboard
  redirect("/restaurateur");
}
