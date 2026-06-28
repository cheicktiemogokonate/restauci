"use client";

import {
  Map,
  MapMarker,
  MapRoute,
  MarkerContent,
  useMap,
} from "@/components/ui/map";
import { useCallback, useEffect, useRef, useState } from "react";

export interface RestaurantMapPin {
  id: string;
  slug: string;
  nom: string;
  latitude: number;
  longitude: number;
  logoUrl?: string | null;
  distanceKm?: number;
}

interface ItineraireData {
  geometrie: [number, number][];
  distanceKm: number;
  dureeMinutes: number;
}

interface RestaurantMapProps {
  centerLat: number;
  centerLng: number;
  restaurants: RestaurantMapPin[];
  selectedId?: string | null;
  itineraire?: ItineraireData | null;
  showRoute?: boolean;
  onSelectRestaurant: (restaurant: RestaurantMapPin) => void;
}

export function RestaurantMap({
  centerLat,
  centerLng,
  restaurants,
  selectedId,
  itineraire,
  showRoute,
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
      <Map center={[centerLng, centerLat]} zoom={13}>
        <MapInner
          centerLat={centerLat}
          centerLng={centerLng}
          restaurants={restaurants}
          selectedId={selectedId}
          itineraire={itineraire}
          showRoute={showRoute}
          onSelectRestaurant={onSelectRestaurant}
          onMapReady={handleMapReady}
        />
      </Map>

      {/* Error overlay with retry */}
      {mapError && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-red-50/90 backdrop-blur-sm"
          onClick={handleRetry}
        >
          <div className="cursor-pointer rounded-xl bg-white p-6 text-center shadow-lg">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="font-medium text-red-700">{mapError}</p>
            <p className="mt-2 text-sm text-gray-500">Appuyez pour réessayer</p>
          </div>
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
  onSelectRestaurant,
  onMapReady,
}: MapInnerProps) {
  const { map, isLoaded } = useMap();

  // Signal to parent that the map is ready
  useEffect(() => {
    if (isLoaded) {
      onMapReady();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // Recenter the map when the provided coordinates change
  useEffect(() => {
    if (!map) return;
    map.easeTo({
      center: [centerLng, centerLat],
      duration: 800,
    });
  }, [centerLat, centerLng, map]);

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
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={restaurant.logoUrl}
                      alt={restaurant.nom}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: "18px" }}>🍽️</span>
                  )}
                </div>
                <span 
                  className={`mt-1.5 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm transition-all duration-200 ${
                    isSelected 
                      ? 'bg-green-700 text-white scale-110' 
                      : 'bg-white text-gray-800 border border-gray-200'
                  }`}
                >
                  {restaurant.nom}
                </span>
              </div>
            </MarkerContent>
          </MapMarker>
        );
      })}
    </>
  );
}
