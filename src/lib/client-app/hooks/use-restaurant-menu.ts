"use client";

import { useEffect, useState } from "react";
import { clientApi } from "../api-client";

export interface MenuPlat {
  id: string;
  nom: string;
  description?: string | null;
  prix: number;
  photoUrl?: string | null;
  disponible: boolean;
}

export interface MenuCategorie {
  id: string;
  nom: string;
  plats: MenuPlat[];
}

export function useRestaurantMenu(slug: string | null) {
  const [categories, setCategories] = useState<MenuCategorie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!slug) {
        setCategories([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const result = await clientApi.get<MenuCategorie[]>(
        `/restaurants/${slug}/menu`,
      );
      if (result.success && result.data) {
        setCategories(result.data);
        setError(null);
      } else {
        setCategories([]);
        setError(result.error ?? "Impossible de charger le menu.");
      }

      setIsLoading(false);
    };

    void Promise.resolve().then(load);
  }, [slug]);

  return { categories, isLoading, error };
}
