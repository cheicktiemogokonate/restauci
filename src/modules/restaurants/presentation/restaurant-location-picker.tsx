"use client";

import { Map, MapControls, MapMarker, MarkerContent } from "@/components/ui/map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/motion/input";
import { Label } from "@/components/ui/label";
import { ABIDJAN_CENTER, RESTAURANT_DETAIL_ZOOM } from "@/shared/ui/map-config";
import { LocateFixed, MapPin, Search } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import type { RestaurantProfileActions } from "./action-types";

type Coordinates = { lat: number; lng: number };

type RestaurantLocationPickerProps = {
  adresse: string;
  ville: string;
  pays: string;
  coordinates: Coordinates | null;
  onAdresseChange: (value: string) => void;
  onVilleChange: (value: string) => void;
  onPaysChange: (value: string) => void;
  onCoordinatesChange: (value: Coordinates) => void;
  geocodeAction: RestaurantProfileActions["geocode"];
};

function formatCoordinate(value: number) {
  return value.toFixed(6);
}

export function RestaurantLocationPicker({
  adresse,
  ville,
  pays,
  coordinates,
  onAdresseChange,
  onVilleChange,
  onPaysChange,
  onCoordinatesChange,
  geocodeAction,
}: RestaurantLocationPickerProps) {
  const [isSearching, startSearchTransition] = useTransition();
  const [isLocating, setIsLocating] = useState(false);
  const point = coordinates ?? { lat: ABIDJAN_CENTER[1], lng: ABIDJAN_CENTER[0] };

  const updatePoint = useCallback(
    (next: Coordinates) => onCoordinatesChange(next),
    [onCoordinatesChange],
  );

  const searchAddress = () => {
    startSearchTransition(async () => {
      const result = await geocodeAction({ adresse, ville, pays });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      updatePoint({ lat: result.result.lat, lng: result.result.lng });
      if (result.result.ville) onVilleChange(result.result.ville);
      if (result.result.pays) onPaysChange(result.result.pays);
      toast.success("Position trouvée. Ajustez le marqueur si nécessaire.");
    });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updatePoint({ lat: position.coords.latitude, lng: position.coords.longitude });
        setIsLocating(false);
        toast.success("Position actuelle appliquée.");
      },
      () => {
        setIsLocating(false);
        toast.error("Impossible d'obtenir votre position. Vérifiez l'autorisation du navigateur.");
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-2 md:col-span-3">
          <Label htmlFor="restaurant-address">Adresse</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="restaurant-address"
              value={adresse}
              onChange={onAdresseChange}
              placeholder="Ex. Cocody Riviera 3, Rue des Jardins"
              required
            />
            <Button
              type="button"
              onClick={searchAddress}
              disabled={isSearching || adresse.trim().length < 3}
              className="shrink-0"
            >
              <Search className="size-4" />
              {isSearching ? "Recherche…" : "Rechercher sur la carte"}
            </Button>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="restaurant-city">Ville</Label>
          <Input id="restaurant-city" value={ville} onChange={onVilleChange} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="restaurant-country">Pays</Label>
          <Input id="restaurant-country" value={pays} onChange={onPaysChange} />
        </div>
        <div className="flex items-end">
          <Button type="button" variant="outline" onClick={useCurrentLocation} disabled={isLocating} className="w-full">
            <LocateFixed className="size-4" />
            {isLocating ? "Localisation…" : "Utiliser ma position"}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-border/70 p-0">
        <div className="flex flex-col gap-2 border-b border-border/70 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Emplacement précis</p>
            <p className="text-xs text-muted-foreground">Cliquez sur la carte ou faites glisser le marqueur.</p>
          </div>
          <Badge variant="secondary" className="w-fit font-mono text-[11px]">
            {coordinates
              ? `${formatCoordinate(point.lat)}, ${formatCoordinate(point.lng)}`
              : "Position à confirmer"}
          </Badge>
        </div>
        <div className="h-72 sm:h-80">
          <Map
            className="h-full w-full"
            viewport={{ center: [point.lng, point.lat], zoom: RESTAURANT_DETAIL_ZOOM }}
            onViewportChange={() => undefined}
            onMapClick={updatePoint}
          >
            <MapControls
              showZoom
              showLocate
              position="bottom-right"
              onLocate={(next) => updatePoint({ lat: next.latitude, lng: next.longitude })}
            />
            <MapMarker longitude={point.lng} latitude={point.lat} draggable onDragEnd={updatePoint}>
              <MarkerContent>
                <div className="flex size-9 items-center justify-center rounded-full border-2 border-white bg-brand-green text-white shadow-lg">
                  <MapPin className="size-4" fill="currentColor" />
                </div>
              </MarkerContent>
            </MapMarker>
          </Map>
        </div>
      </Card>
      <p className="text-xs text-muted-foreground">Les coordonnées sont enregistrées automatiquement lorsque vous sauvegardez le profil.</p>
    </div>
  );
}
