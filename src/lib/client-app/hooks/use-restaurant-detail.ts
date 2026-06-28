"use client";

import { useEffect, useState } from "react";
import { clientApi } from "../api-client";

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
  const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRestaurant = async () => {
      if (!slug) {
        setRestaurant(null);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (userLat !== undefined) params.set("lat", String(userLat));
      if (userLng !== undefined) params.set("lng", String(userLng));

      const queryStr = params.toString();

      const result = await clientApi.get<RestaurantDetail>(
        `/restaurants/${slug}${queryStr ? `?${queryStr}` : ""}`,
      );

      if (result.success && result.data) {
        setRestaurant(result.data);
      } else {
        setError(result.error ?? "Restaurant introuvable");
      }

      setIsLoading(false);
    };

    void Promise.resolve().then(loadRestaurant);
  }, [slug, userLat, userLng]);

  return { restaurant, isLoading, error };
}
