"use client";

import { usePanierStore } from "../stores/panier-store";
import { useRestaurantDetail } from "./use-restaurant-detail";

/**
 * Charge les infos complètes du restaurant actuellement dans le panier
 * (frais de livraison, minimum de commande, modes disponibles).
 */
export function usePanierRestaurant() {
  const slug = usePanierStore((s) => s.restaurantSlug);
  return useRestaurantDetail(slug);
}