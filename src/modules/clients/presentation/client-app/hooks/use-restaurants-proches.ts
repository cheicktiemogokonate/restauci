"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clientApi } from "../api-client";
import type { ClientLocationSample } from "../location-context";

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
  placement: "promoted" | "organic";
  partnerBadgeEnabled: boolean;
  discoveryToken: string;
}

interface UseRestaurantsProchesOptions {
  currentLocation: ClientLocationSample | null;
  search?: string;
  cuisine?: string;
}

export function useRestaurantsProches({
  currentLocation,
  search,
  cuisine,
}: UseRestaurantsProchesOptions) {
  const [restaurants, setRestaurants] = useState<RestaurantProche[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marketName, setMarketName] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const charger = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (!currentLocation) {
      setRestaurants([]);
      setMarketName(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    const result = await clientApi.post<{
      items: RestaurantProche[];
      market: { name: string } | null;
      policyMode: "off" | "shadow" | "enforce";
    }>(
      "/restaurants/search",
      {
        currentLocation,
        search: search || undefined,
        cuisine: cuisine || undefined,
        page: 1,
        limit: 50,
      },
    );
    if (requestId !== requestIdRef.current) return;

    if (result.success && result.data) {
      setRestaurants(result.data.items);
      setMarketName(result.data.market?.name ?? null);
    } else {
      setRestaurants([]);
      setMarketName(null);
      setError(result.error ?? "Impossible de charger les restaurants");
    }
    setIsLoading(false);
  }, [currentLocation, search, cuisine]);

  useEffect(() => {
    const run = async () => {
      await charger();
    };

    void run();
  }, [charger]);

  return {
    restaurants,
    isLoading,
    error,
    marketName,
    recharger: charger,
  };
}
