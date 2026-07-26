"use client";

import { readClientMemoryCache, writeClientMemoryCache } from "@/lib/client-app/client-memory-cache";
import { useEffect, useState } from "react";
import { clientApi } from "../api-client";

const MENU_CACHE_MAX_AGE_MS = 60_000;

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
  const endpoint = slug ? `/restaurants/${slug}/menu` : null;
  const initialCache = endpoint ? readClientMemoryCache<MenuCategorie[]>(endpoint, MENU_CACHE_MAX_AGE_MS) : null;
  const [categories, setCategories] = useState<MenuCategorie[]>(() => initialCache?.data ?? []);
  const [isLoading, setIsLoading] = useState(() => !initialCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      if (!endpoint) {
        if (isActive) {
          setCategories([]);
          setIsLoading(false);
          setError(null);
        }
        return;
      }

      const cached = readClientMemoryCache<MenuCategorie[]>(endpoint, MENU_CACHE_MAX_AGE_MS);
      if (cached?.isFresh) {
        if (isActive) {
          setCategories(cached.data);
          setIsLoading(false);
          setError(null);
        }
        return;
      }

      if (isActive && cached) {
        setCategories(cached.data);
        setIsLoading(false);
        setError(null);
      } else if (isActive) {
        setCategories([]);
        setIsLoading(true);
        setError(null);
      }
      try {
        const result = await clientApi.get<MenuCategorie[]>(
          endpoint,
        );
        if (!isActive) return;
        if (result.success && result.data) {
          writeClientMemoryCache(endpoint, result.data);
          setCategories(result.data);
        } else {
          if (!cached) setCategories([]);
          setError(result.error ?? "Impossible de charger le menu.");
        }
      } catch {
        if (isActive) {
          if (!cached) setCategories([]);
          setError("Impossible de charger le menu.");
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void Promise.resolve().then(load);
    return () => {
      isActive = false;
    };
  }, [endpoint]);

  return { categories, isLoading, error };
}
