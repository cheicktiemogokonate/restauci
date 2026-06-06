"use client";

import { useState } from "react";
import type { Coordonnees } from "@/types";

export function useGeolocation() {
  const [coords, setCoords] = useState<Coordonnees | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const demander = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setError("Géolocalisation non disponible dans ce navigateur.");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLoading(false);
      },
      (geoError) => {
        setError(
          geoError.message || "Autorisation de géolocalisation refusée."
        );
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  };

  return { coords, loading, error, demander };
}
