"use client";

import { useCallback, useEffect, useState } from "react";
import { ABIDJAN_CENTER } from "../map-config";

export type GeolocationStatus =
  | "idle"
  | "demande"
  | "accordee"
  | "refusee"
  | "indisponible";

interface GeolocationState {
  lat: number;
  lng: number;
  status: GeolocationStatus;
  demander: () => void;
}

/**
 * Hook de geolocalisation navigateur avec fallback Abidjan.
 * Ne demande JAMAIS automatiquement — l'appelant doit declencher
 * demander() suite à une action explicite de l'utilisateur
 * (bouton "Me localiser" ou equivalent), conformement aux bonnes
 * pratiques de consentement.
 */
export function useGeolocation(): GeolocationState {
  const [lat, setLat] = useState(ABIDJAN_CENTER[1]);
  const [lng, setLng] = useState(ABIDJAN_CENTER[0]);
  const [status, setStatus] = useState<GeolocationStatus>("idle");

  const demander = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setStatus("indisponible");
      return;
    }

    setStatus("demande");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setStatus("accordee");
      },
      (error) => {
        setStatus(
          error.code === error.PERMISSION_DENIED ? "refusee" : "indisponible",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      },
    );
  }, []);

  useEffect(() => {
    void Promise.resolve().then(demander);
  }, [demander]);

  return { lat, lng, status, demander };
}
