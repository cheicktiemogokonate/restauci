import type { ServiceTypeInput } from "@/lib/actions/onboarding";

export type EstablishmentType = "restaurant" | "residence" | "event";

export const ESTABLISHMENT_TYPE_OPTIONS = [
  { id: "restaurant", name: "Restaurant", available: true },
  { id: "residence", name: "Résidence", available: false },
  { id: "event", name: "Événement", available: false },
] as const satisfies readonly {
  id: EstablishmentType;
  name: string;
  available: boolean;
}[];

export const RESTAURANT_TYPE_OPTIONS = [
  {
    id: "maquis",
    name: "Maquis",
    description: "Cuisine ivoirienne, grillades et ambiance conviviale.",
  },
  {
    id: "restaurant",
    name: "Restaurant",
    description: "Service à table et carte de plats variés.",
  },
  {
    id: "fastfood",
    name: "Restauration rapide",
    description: "Service rapide, formules et vente à emporter.",
  },
  {
    id: "cafe",
    name: "Café & salon de thé",
    description: "Boissons, pâtisseries et petite restauration.",
  },
  {
    id: "bakery",
    name: "Boulangerie & pâtisserie",
    description: "Pains, viennoiseries et créations sucrées.",
  },
  {
    id: "bar-lounge",
    name: "Bar & lounge",
    description: "Boissons, cocktails et restauration d’accompagnement.",
  },
] as const;

export const SERVICE_TYPE_OPTIONS = [
  {
    id: "dine-in",
    name: "Sur place",
    description: "Les clients consomment directement dans l’établissement.",
  },
  {
    id: "takeout",
    name: "À emporter",
    description: "Les commandes sont préparées pour être récupérées sur place.",
  },
  {
    id: "delivery",
    name: "Livraison",
    description: "Les commandes peuvent être livrées aux clients.",
  },
] as const satisfies readonly {
  id: ServiceTypeInput;
  name: string;
  description: string;
}[];

export function getEstablishmentCategoryLabel(categoryId: string) {
  return (
    RESTAURANT_TYPE_OPTIONS.find((category) => category.id === categoryId)
      ?.name ?? null
  );
}

export function getEstablishmentTypeLabel(type: EstablishmentType) {
  return (
    ESTABLISHMENT_TYPE_OPTIONS.find((option) => option.id === type)?.name ??
    null
  );
}

export function getServiceTypeLabel(serviceType: ServiceTypeInput) {
  const normalized =
    serviceType === "sur_place"
      ? "dine-in"
      : serviceType === "emporter"
        ? "takeout"
        : serviceType === "livraison"
          ? "delivery"
          : serviceType;

  return (
    SERVICE_TYPE_OPTIONS.find((service) => service.id === normalized)?.name ??
    null
  );
}
