"use client";

import { useCallback, useEffect, useState } from "react";
import { clientApi } from "../api-client";

export interface RestaurantProche {
  id: string;
  nom: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  banniereUrl?: string | null;
  adresse: string;
  ville?: string | null;
  latitude: number;
  longitude: number;
  cuisines?: string[];
  noteMoyenne?: number | null;
  nombreAvis?: number;
  distanceKm?: number;
  enLigne: boolean;
  accepteCommandes: boolean;
}

interface UseRestaurantsProchesOptions {
  lat: number;
  lng: number;
  rayon?: number;
  search?: string;
  cuisine?: string;
}

export function useRestaurantsProches({
  lat,
  lng,
  rayon = 10,
  search,
  cuisine,
}: UseRestaurantsProchesOptions) {
  const [restaurants, setRestaurants] = useState<RestaurantProche[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      rayon: String(rayon),
      limit: "50",
    });
    if (search) params.set("search", search);
    if (cuisine) params.set("cuisine", cuisine);

    const result = await clientApi.get<RestaurantProche[]>(
      `/restaurants?${params.toString()}`,
    );

    if (result.success && result.data) {
      setRestaurants(result.data);
    } else {
      setError(result.error ?? "Impossible de charger les restaurants");
    }
    setIsLoading(false);
  }, [lat, lng, rayon, search, cuisine]);

  useEffect(() => {
    const run = async () => {
      await charger();
    };

    void run();
  }, [charger]);

  return { restaurants, isLoading, error, recharger: charger };
}
