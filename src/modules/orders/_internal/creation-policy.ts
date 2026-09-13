import { createHash } from "node:crypto";
import {
  calculerSousTotalFcfa,
  calculerTotalCommandeFcfa,
} from "@/shared/money";
import { RestaurantOrderError } from "@/modules/orders/model";
import type { CreateRestaurantOrderInput } from "@/modules/orders/contracts";
export type { CreateRestaurantOrderInput } from "@/modules/orders/contracts";
export { RestaurantOrderError } from "@/modules/orders/model";
export type { RestaurantOrderErrorCode } from "@/modules/orders/model";

const MAX_QUANTITY_PER_DISH = 20;

export function normalizeRestaurantOrderInput(
  input: CreateRestaurantOrderInput,
): CreateRestaurantOrderInput {
  const quantities = new Map<string, number>();
  for (const item of input.items) {
    if (!Number.isSafeInteger(item.quantite) || item.quantite <= 0) {
      throw new RestaurantOrderError(
        "INVALID_QUANTITY",
        "La quantité doit être un entier strictement positif.",
      );
    }
    const quantity = (quantities.get(item.platId) ?? 0) + item.quantite;
    if (quantity > MAX_QUANTITY_PER_DISH) {
      throw new RestaurantOrderError(
        "INVALID_QUANTITY",
        `La quantité maximale par plat est ${MAX_QUANTITY_PER_DISH}.`,
      );
    }
    quantities.set(item.platId, quantity);
  }

  return {
    restaurantSlug: input.restaurantSlug.trim(),
    modeCommande: input.modeCommande,
    paymentMethod: input.paymentMethod,
    items: [...quantities]
      .map(([platId, quantite]) => ({ platId, quantite }))
      .sort((a, b) => a.platId.localeCompare(b.platId)),
    ...(input.currentLocation ? { currentLocation: input.currentLocation } : {}),
    ...(input.adresseLivraison?.trim()
      ? { adresseLivraison: input.adresseLivraison.trim() }
      : {}),
    ...(input.latitudeLivraison !== undefined
      ? { latitudeLivraison: input.latitudeLivraison }
      : {}),
    ...(input.longitudeLivraison !== undefined
      ? { longitudeLivraison: input.longitudeLivraison }
      : {}),
    ...(input.numeroTable?.trim()
      ? { numeroTable: input.numeroTable.trim() }
      : {}),
    ...(input.noteClient?.trim() ? { noteClient: input.noteClient.trim() } : {}),
  };
}

export function hashRestaurantOrderIntent(
  normalizedInput: CreateRestaurantOrderInput,
): string {
  const commercialIntent = { ...normalizedInput };
  delete commercialIntent.currentLocation;
  return createHash("sha256")
    .update(JSON.stringify(commercialIntent))
    .digest("hex");
}

export function calculateRestaurantOrderAmounts({
  items,
  modeCommande,
  fraisLivraisonFcfa,
  commandeMinimumFcfa,
}: {
  items: readonly { prix: number; quantite: number }[];
  modeCommande: "sur_place" | "livraison" | "emporter";
  fraisLivraisonFcfa: number;
  commandeMinimumFcfa: number;
}) {
  const sousTotal = calculerSousTotalFcfa(items);
  if (sousTotal < commandeMinimumFcfa) {
    throw new RestaurantOrderError(
      "MINIMUM_ORDER_NOT_REACHED",
      `Commande minimum : ${commandeMinimumFcfa.toLocaleString("fr-FR")} FCFA`,
      { minimumFcfa: commandeMinimumFcfa },
    );
  }
  const fraisLivraison =
    modeCommande === "livraison" ? fraisLivraisonFcfa : 0;
  const remise = 0;
  const total = calculerTotalCommandeFcfa(
    sousTotal,
    fraisLivraison,
    remise,
  );
  if (total < 0) throw new Error("Total de commande incohérent");
  return { sousTotal, fraisLivraison, remise, total };
}
