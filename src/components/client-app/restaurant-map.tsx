"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Map,
  MapControls,
  MapMarker,
  MapRoute,
  MarkerContent,
  useMap,
} from "@/components/ui/map";
import { AlertCircle, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export interface RestaurantMapPin {
  id: string;
  slug: string;
  nom: string;
  latitude: number;
  longitude: number;
  logoUrl?: string | null;
  distanceKm?: number;
  placement: "promoted" | "organic";
}

interface ItineraireData {
  geometrie: [number, number][];
  distanceKm: number;
  dureeMinutes: number;
}

const RESTAURANT_FOCUS_ZOOM = 16;

interface RestaurantMapProps {
  centerLat: number;
  centerLng: number;
  restaurants: RestaurantMapPin[];
  selectedId?: string | null;
  itineraire?: ItineraireData | null;
  showRoute?: boolean;
  focusRestaurants?: boolean;
  onSelectRestaurant: (restaurant: RestaurantMapPin) => void;
}

export function RestaurantMap({
  centerLat,
  centerLng,
  restaurants,
  selectedId,
  itineraire,
  showRoute,
  focusRestaurants,
  onSelectRestaurant,
}: RestaurantMapProps) {
  const [mapError, setMapError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Start a load timeout — cleared once MapInner reports the map is ready
  useEffect(() => {
    if (mapReady) return; // already loaded, nothing to do

    timeoutRef.current = setTimeout(() => {
      if (!mapReady) {
        setMapError(
          "La carte met trop de temps à charger. Vérifiez votre connexion internet.",
        );
      }
    }, 30000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [mapReady]);

  // Stable callback for MapInner to signal the map is ready
  const handleMapReady = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMapReady(true);
    setMapError(null);
  }, []);

  const handleRetry = useCallback(() => {
    setMapError(null);
    setMapReady(false);
  }, []);

  return (
    <div className="relative w-full h-full">
      <Map center={[centerLng, centerLat]} zoom={15}>
        <MapControls
          position="bottom-right"
          showZoom
          className="right-3 bottom-24"
        />
        <MapInner
          centerLat={centerLat}
          centerLng={centerLng}
          restaurants={restaurants}
          selectedId={selectedId}
          itineraire={itineraire}
          showRoute={showRoute}
          focusRestaurants={focusRestaurants}
          onSelectRestaurant={onSelectRestaurant}
          onMapReady={handleMapReady}
        />
      </Map>

      {/* Error overlay with retry */}
      {mapError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
          <Alert
            variant="destructive"
            className="max-w-sm bg-background shadow-xl"
          >
            <AlertCircle />
            <AlertTitle>Carte indisponible</AlertTitle>
            <AlertDescription>{mapError}</AlertDescription>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="mt-3 w-fit"
            >
              <RefreshCw /> Réessayer
            </Button>
          </Alert>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  MapInner – rendered as a child of <Map> so it can safely call     *
 *  useMap().                                                         *
 * ------------------------------------------------------------------ */
interface MapInnerProps {
  centerLat: number;
  centerLng: number;
  restaurants: RestaurantMapPin[];
  selectedId?: string | null;
  itineraire?: ItineraireData | null;
  showRoute?: boolean;
  focusRestaurants?: boolean;
  onSelectRestaurant: (restaurant: RestaurantMapPin) => void;
  onMapReady: () => void;
}

function MapInner({
  centerLat,
  centerLng,
  restaurants,
  selectedId,
  itineraire,
  showRoute,
  focusRestaurants,
  onSelectRestaurant,
  onMapReady,
}: MapInnerProps) {
  const { map, isLoaded } = useMap();

  // Signal to parent that the map is ready
  useEffect(() => {
    if (isLoaded) {
      onMapReady();
    }
  }, [isLoaded, onMapReady]);

  // Recenter the map when the provided coordinates change
  useEffect(() => {
    if (!map) return;
    map.easeTo({
      center: [centerLng, centerLat],
      duration: 800,
    });
  }, [centerLat, centerLng, map]);

  // Au clic sur un marqueur, rapprocher la carte du restaurant sélectionné.
  // Conserver toutefois un éventuel zoom manuel déjà plus précis.
  useEffect(() => {
    if (!map || !selectedId) return;

    const selectedRestaurant = restaurants.find(
      (restaurant) => restaurant.id === selectedId,
    );
    if (!selectedRestaurant) return;

    map.easeTo({
      center: [selectedRestaurant.longitude, selectedRestaurant.latitude],
      zoom: Math.max(map.getZoom(), RESTAURANT_FOCUS_ZOOM),
      duration: 800,
    });
  }, [map, restaurants, selectedId]);

  // Une recherche textuelle peut couvrir tout le marché courant : cadrer ses
  // résultats même s'ils sont éloignés de la position de l'utilisateur.
  useEffect(() => {
    if (!map || !focusRestaurants || restaurants.length === 0) return;

    if (restaurants.length === 1) {
      const [restaurant] = restaurants;
      map.easeTo({
        center: [restaurant.longitude, restaurant.latitude],
        zoom: 14,
        duration: 800,
      });
      return;
    }

    const longitudes = restaurants.map((restaurant) => restaurant.longitude);
    const latitudes = restaurants.map((restaurant) => restaurant.latitude);
    map.fitBounds(
      [
        [Math.min(...longitudes), Math.min(...latitudes)],
        [Math.max(...longitudes), Math.max(...latitudes)],
      ],
      { padding: 80, maxZoom: 14, duration: 800 },
    );
  }, [focusRestaurants, map, restaurants]);

  // Wait for full map readiness before rendering markers
  if (!isLoaded) return null;

  return (
    <>
      {/* Tracé d'itinéraire — uniquement si un restaurant est sélectionné
          ET que l'API a retourné une géométrie OSRM valide */}
      {showRoute && itineraire && itineraire.geometrie.length > 0 && (
        <MapRoute
          coordinates={itineraire.geometrie}
          color="#16a34a"
          width={4}
          opacity={0.85}
        />
      )}

      {/* User location marker — pulsing blue dot */}
      <MapMarker longitude={centerLng} latitude={centerLat}>
        <MarkerContent>
          <div className="relative flex items-center justify-center">
            {/* Pulse ring */}
            <div className="absolute h-8 w-8 animate-ping rounded-full bg-blue-400/30" />
            {/* Inner dot */}
            <div className="relative h-4 w-4 rounded-full border-[2.5px] border-white bg-blue-500 shadow-lg" />
          </div>
        </MarkerContent>
      </MapMarker>

      {/* Restaurant markers */}
      {restaurants.map((restaurant) => {
        const isSelected = restaurant.id === selectedId;
        return (
          <MapMarker
            key={restaurant.id}
            longitude={restaurant.longitude}
            latitude={restaurant.latitude}
            onClick={() => onSelectRestaurant(restaurant)}
          >
            <MarkerContent>
              <div className="flex flex-col items-center drop-shadow-sm">
                <div
                  className="restaurant-marker"
                  style={{
                    width: isSelected ? "48px" : "40px",
                    height: isSelected ? "48px" : "40px",
                    borderRadius: "50%",
                    background: "white",
                    border: isSelected
                      ? "3px solid #15803d"
                      : "2px solid #d1d5db",
                    boxShadow: isSelected
                      ? "0 4px 12px rgba(21,128,61,0.3)"
                      : "0 2px 8px rgba(0,0,0,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    transition: "all 0.2s ease",
                    transform: isSelected ? "scale(1.1)" : "scale(1)",
                  }}
                >
                  {restaurant.logoUrl ? (
                    <Image
                      src={restaurant.logoUrl}
                      alt={restaurant.nom}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span style={{ fontSize: "18px" }}>🍽️</span>
                  )}
                </div>
                <span
                  className={`mt-1.5 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm transition-all duration-200 ${
                    isSelected
                      ? "bg-green-700 text-white scale-110"
                      : "bg-white text-gray-800 border border-gray-200"
                  }`}
                >
                  {restaurant.nom}
                </span>
                {restaurant.placement === "promoted" ? (
                  <span className="mt-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background shadow-sm">
                    Mis en avant
                  </span>
                ) : null}
              </div>
            </MarkerContent>
          </MapMarker>
        );
      })}
    </>
  );
}
