"use client";

import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
} from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { LocateFixed, MapPin } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const COTE_D_IVOIRE_CENTER = { lat: 7.69, lng: -5.03 };

interface InteractiveMapProps {
  latitude: number | null;
  longitude: number | null;
  commune?: string;
  disabled?: boolean;
  onCoordinatesChange: (
    lat: number,
    lng: number,
    commune: string,
    quarter?: string,
    address?: string,
  ) => void;
}

function hasCoordinates(latitude: number | null, longitude: number | null) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0)
  );
}

export default function InteractiveMap({
  latitude,
  longitude,
  commune = "",
  disabled = false,
  onCoordinatesChange,
}: InteractiveMapProps) {
  const initialPoint = hasCoordinates(latitude, longitude)
    ? { lat: latitude as number, lng: longitude as number }
    : COTE_D_IVOIRE_CENTER;
  const [pinPos, setPinPos] = useState(initialPoint);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasCoordinates(latitude, longitude)) return;
    const next = { lat: latitude as number, lng: longitude as number };
    Promise.resolve().then(() => setPinPos(next));
  }, [latitude, longitude]);

  const updatePoint = useCallback(
    (point: { lng: number; lat: number }) => {
      const finalLat = Number(point.lat.toFixed(6));
      const finalLng = Number(point.lng.toFixed(6));
      setPinPos({ lat: finalLat, lng: finalLng });
      setLocationError(null);
      onCoordinatesChange(finalLat, finalLng, commune);
    },
    [commune, onCoordinatesChange],
  );

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("La géolocalisation n’est pas disponible sur cet appareil.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updatePoint({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setLocationError(
          "Position indisponible. Autorisez la localisation ou placez le marqueur manuellement.",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const isConfirmed = hasCoordinates(latitude, longitude);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Emplacement précis</p>
          <p className="text-xs leading-5 text-muted-foreground">
            Cliquez sur la carte ou faites glisser le marqueur.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={useCurrentLocation}
          disabled={disabled || isLocating}
          className="w-full sm:w-auto"
        >
          <LocateFixed className="size-4" />
          {isLocating ? "Localisation…" : "Utiliser ma position"}
        </Button>
      </div>

      <div className="relative h-72 overflow-hidden rounded-xl border bg-slate-100 sm:h-80">
        <Map
          className="h-full w-full"
          viewport={{ center: [pinPos.lng, pinPos.lat], zoom: isConfirmed ? 15 : 7 }}
          onViewportChange={() => undefined}
          onMapClick={disabled ? undefined : updatePoint}
        >
          <MapControls
            showZoom
            showLocate={!disabled}
            position="bottom-right"
            onLocate={(point) =>
              updatePoint({ lat: point.latitude, lng: point.longitude })
            }
          />
          <MapMarker
            longitude={pinPos.lng}
            latitude={pinPos.lat}
            draggable={!disabled}
            onDragEnd={disabled ? undefined : updatePoint}
          >
            <MarkerContent>
              <div className="flex size-9 items-center justify-center rounded-full border-2 border-white bg-brand-green text-white shadow-md">
                <MapPin className="size-4" fill="currentColor" />
              </div>
            </MarkerContent>
          </MapMarker>
        </Map>
      </div>

      <div aria-live="polite" className="text-xs">
        {locationError ? (
          <p className="text-destructive">{locationError}</p>
        ) : (
          <p className={isConfirmed ? "text-emerald-700" : "text-muted-foreground"}>
            {isConfirmed
              ? "Position enregistrée automatiquement. Vous pouvez encore l’ajuster."
              : "Placez le marqueur pour confirmer la position. Les coordonnées restent masquées."}
          </p>
        )}
      </div>
    </div>
  );
}
