"use server";

import { getCurrentUser } from "@/lib/auth";
import { createRestaurant } from "@/lib/db/mutations";
import { getMyRestaurant } from "@/lib/db/queries";
import { createLogger } from "@/lib/logger";
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
  description?: string;
  logoUrl?: string;
  banniereUrl?: string;
  pays?: string;
  ville?: string;
  email?: string;
  siteWeb?: string;
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

  const normalizedModes = data.modesCommande.map(normalizeMode);
  const parsed = restaurantSchema.safeParse({
    ...data,
    modesCommande: normalizedModes,
  });
  if (!parsed.success) {
    return { error: "Données invalides" };
  }

  const mappedModes = parsed.data.modesCommande;

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
      description: parsed.data.description,
      logoUrl: parsed.data.logoUrl,
      banniereUrl: parsed.data.banniereUrl,
      pays: parsed.data.pays,
      ville: parsed.data.ville,
      email: parsed.data.email,
      siteWeb: parsed.data.siteWeb,
    });
  } catch (error) {
    log.error({ error, userId: session.userId }, "finaliserOnboarding error");
    return { error: "Impossible de créer le restaurant. Réessaye." };
  }

  // 4. Rediriger vers le dashboard
  redirect("/restaurateur");
}
