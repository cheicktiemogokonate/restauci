"use client";

import { useEffect, useMemo, useState } from "react";
import type { CommandeItem, Plat } from "@/types";

const STORAGE_PREFIX = "panier_";

export function usePanier(restaurantId: string) {
  const storageKey = `${STORAGE_PREFIX}${restaurantId}`;
  const [items, setItems] = useState<CommandeItem[]>([]);

  // Restore from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      try {
        setItems(JSON.parse(stored) as CommandeItem[]);
      } catch {
        setItems([]);
      }
    }
  }, [storageKey]);

  // Persist to localStorage on change
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, storageKey]);

  /** Ajoute 1 unité du plat (incrémente si déjà présent) */
  const ajouterPlat = (plat: Plat) => {
    setItems((current) => {
      const existing = current.find((item) => item.platId === plat.id);
      if (existing) {
        return current.map((item) =>
          item.platId === plat.id ? { ...item, quantite: item.quantite + 1 } : item
        );
      }
      return [...current, { platId: plat.id, nom: plat.nom, prix: plat.prix, quantite: 1 }];
    });
  };

  /** Décrémente de 1 unité — supprime l'article si quantité atteint 0 */
  const decrementerPlat = (platId: string) => {
    setItems((current) => {
      const existing = current.find((item) => item.platId === platId);
      if (!existing) return current;
      if (existing.quantite <= 1) return current.filter((item) => item.platId !== platId);
      return current.map((item) =>
        item.platId === platId ? { ...item, quantite: item.quantite - 1 } : item
      );
    });
  };

  /** Incrémente de 1 unité un article déjà dans le panier */
  const incrementerPlat = (platId: string) => {
    setItems((current) =>
      current.map((item) =>
        item.platId === platId ? { ...item, quantite: item.quantite + 1 } : item
      )
    );
  };

  /** Retire entièrement un article du panier, peu importe la quantité */
  const supprimerPlat = (platId: string) => {
    setItems((current) => current.filter((item) => item.platId !== platId));
  };

  /** @deprecated Utiliser decrementerPlat ou supprimerPlat à la place */
  const retirerPlat = decrementerPlat;

  const viderPanier = () => setItems([]);

  const sousTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.prix * item.quantite, 0),
    [items]
  );

  const nombreArticles = useMemo(
    () => items.reduce((sum, item) => sum + item.quantite, 0),
    [items]
  );

  return {
    items,
    ajouterPlat,
    decrementerPlat,
    incrementerPlat,
    supprimerPlat,
    retirerPlat,
    viderPanier,
    sousTotal,
    total: sousTotal,
    nombreArticles,
  };
}
