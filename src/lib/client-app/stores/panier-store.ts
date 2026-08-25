"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface PanierItem {
  platId: string;
  nom: string;
  prix: number; // FCFA entiers
  quantite: number;
  photoUrl?: string | null;
}

interface PanierState {
  restaurantId: string | null;
  restaurantNom: string | null;
  restaurantSlug: string | null;
  discoveryToken: string | null;
  items: PanierItem[];

  ajouterItem: (
    restaurant: {
      id: string;
      nom: string;
      slug: string;
      discoveryToken?: string | null;
    },
    item: Omit<PanierItem, "quantite">
  ) => void;
  retirerItem: (platId: string) => void;
  changerQuantite: (platId: string, quantite: number) => void;
  vider: () => void;

  // Calculs dérivés
  sousTotal: () => number;
  nombreItems: () => number;
}

export const usePanierStore = create<PanierState>()(
  persist(
    (set, get) => ({
      restaurantId: null,
      restaurantNom: null,
      restaurantSlug: null,
      discoveryToken: null,
      items: [],

      ajouterItem: (restaurant, item) => {
        const state = get();

        // Si le panier contient déjà des items d'un AUTRE restaurant,
        // on vide le panier avant d'ajouter (un panier = un seul resto)
        if (state.restaurantId && state.restaurantId !== restaurant.id) {
          set({
            restaurantId: restaurant.id,
            restaurantNom: restaurant.nom,
            restaurantSlug: restaurant.slug,
            discoveryToken: restaurant.discoveryToken ?? null,
            items: [{ ...item, quantite: 1 }],
          });
          return;
        }

        const existant = state.items.find((i) => i.platId === item.platId);

        if (existant) {
          set({
            restaurantId: restaurant.id,
            restaurantNom: restaurant.nom,
            restaurantSlug: restaurant.slug,
            discoveryToken:
              state.discoveryToken ?? restaurant.discoveryToken ?? null,
            items: state.items.map((i) =>
              i.platId === item.platId
                ? { ...i, quantite: i.quantite + 1 }
                : i
            ),
          });
        } else {
          set({
            restaurantId: restaurant.id,
            restaurantNom: restaurant.nom,
            restaurantSlug: restaurant.slug,
            discoveryToken:
              state.discoveryToken ?? restaurant.discoveryToken ?? null,
            items: [...state.items, { ...item, quantite: 1 }],
          });
        }
      },

      retirerItem: (platId) =>
        set((state) => {
          const items = state.items.filter((i) => i.platId !== platId);
          return items.length === 0
            ? {
                restaurantId: null,
                restaurantNom: null,
                restaurantSlug: null,
                discoveryToken: null,
                items: [],
              }
            : { items };
        }),

      changerQuantite: (platId, quantite) =>
        set((state) => {
          if (quantite <= 0) {
            const items = state.items.filter((i) => i.platId !== platId);
            return items.length === 0
              ? {
                  restaurantId: null,
                  restaurantNom: null,
                  restaurantSlug: null,
                  discoveryToken: null,
                  items: [],
                }
              : { items };
          }
          return {
            items: state.items.map((i) =>
              i.platId === platId ? { ...i, quantite } : i
            ),
          };
        }),

      vider: () =>
        set({
          restaurantId: null,
          restaurantNom: null,
          restaurantSlug: null,
          discoveryToken: null,
          items: [],
        }),

      sousTotal: () =>
        get().items.reduce((sum, i) => sum + i.prix * i.quantite, 0),

      nombreItems: () =>
        get().items.reduce((sum, i) => sum + i.quantite, 0),
    }),
    {
      name: "restauci-client-panier",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
