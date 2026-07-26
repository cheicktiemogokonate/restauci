"use client";

import { readClientMemoryCache, writeClientMemoryCache } from "@/lib/client-app/client-memory-cache";
import { useEffect, useMemo, useState } from "react";
import { clientApi } from "../api-client";

const DETAIL_CACHE_MAX_AGE_MS = 30_000;

export interface RestaurantDetail {
  id: string;
  nom: string;
  slug: string;
  latitude: number;
  longitude: number;
  description?: string | null;
  logoUrl?: string | null;
  banniereUrl?: string | null;
  adresse: string;
  telephone: string;
  email?: string | null;
  siteWeb?: string | null;
  instagram?: string | null;
  whatsapp?: string | null;
  cuisines?: string[];
  noteMoyenne?: number | null;
  nombreAvis?: number;
  fraisLivraison: number;
  commandeMinimum: number;
  modesCommande: string[];
  enLigne: boolean;
  accepteCommandes: boolean;
  geo?: {
    distanceKm: number;
    itineraire?: {
      distanceKm: number;
      dureeMinutes: number;
      geometrie?: [number, number][];
    } | null;
  } | null;
  tempsAttente: {
    totalMinutes: number;
    label: string;
    detail?: {
      preparation: number;
      chargeActuelle: number;
      trajet: number;
    };
  };
  commandesEnCours: number;
}

export function useRestaurantDetail(
  slug: string | null,
  userLat?: number,
  userLng?: number,
) {
  const endpoint = useMemo(() => {
    if (!slug) return null;

    const params = new URLSearchParams();
    if (userLat !== undefined) params.set("lat", String(userLat));
    if (userLng !== undefined) params.set("lng", String(userLng));
    const queryString = params.toString();

    return `/restaurants/${slug}${queryString ? `?${queryString}` : ""}`;
  }, [slug, userLat, userLng]);
  const initialCache = endpoint ? readClientMemoryCache<RestaurantDetail>(endpoint, DETAIL_CACHE_MAX_AGE_MS) : null;
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(() => initialCache?.data ?? null);
  const [isLoading, setIsLoading] = useState(() => !initialCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadRestaurant = async () => {
      if (!endpoint) {
        if (isActive) {
          setRestaurant(null);
          setIsLoading(false);
          setError(null);
        }
        return;
      }

      const cached = readClientMemoryCache<RestaurantDetail>(endpoint, DETAIL_CACHE_MAX_AGE_MS);
      if (cached?.isFresh) {
        if (isActive) {
          setRestaurant(cached.data);
          setIsLoading(false);
          setError(null);
        }
        return;
      }

      if (isActive && cached) {
        setRestaurant(cached.data);
        setIsLoading(false);
        setError(null);
      } else if (isActive) {
        setRestaurant(null);
        setIsLoading(true);
        setError(null);
      }

      try {
        const result = await clientApi.get<RestaurantDetail>(
          endpoint,
        );
        if (!isActive) return;
        if (result.success && result.data) {
          writeClientMemoryCache(endpoint, result.data);
          setRestaurant(result.data);
        } else {
          if (!cached) setRestaurant(null);
          setError(result.error ?? "Restaurant introuvable");
        }
      } catch {
        if (isActive) {
          if (!cached) setRestaurant(null);
          setError("Impossible de charger ce restaurant.");
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    void Promise.resolve().then(loadRestaurant);
    return () => {
      isActive = false;
    };
  }, [endpoint]);

  return { restaurant, isLoading, error };
}
