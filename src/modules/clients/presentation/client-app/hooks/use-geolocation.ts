"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientLocationSample } from "../location-context";

export type GeolocationStatus =
  | "idle"
  | "demande"
  | "accordee"
  | "refusee"
  | "indisponible";

interface GeolocationState {
  currentLocation: ClientLocationSample | null;
  status: GeolocationStatus;
  demander: () => void;
}

/**
 * Position actuelle dynamique. Aucune coordonnée de fallback n'est exposée :
 * une permission refusée reste un vrai état bloquant pour Restaurants.
 */
export function useGeolocation(): GeolocationState {
  const [currentLocation, setCurrentLocation] =
    useState<ClientLocationSample | null>(null);
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const watchIdRef = useRef<number | null>(null);

  const demander = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setStatus("indisponible");
      return;
    }

    setStatus("demande");

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
          capturedAt: new Date(position.timestamp).toISOString(),
        });
        setStatus("accordee");
      },
      (error) => {
        setStatus(
          error.code === error.PERMISSION_DENIED ? "refusee" : "indisponible",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 60000,
      },
    );
  }, []);

  useEffect(() => {
    void Promise.resolve().then(demander);
    return () => {
      if (watchIdRef.current !== null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [demander]);

  return { currentLocation, status, demander };
}
