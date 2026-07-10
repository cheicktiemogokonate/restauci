"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Map,
  MapControls,
  MapMarker,
  MapRoute,
  MarkerContent,
  MarkerLabel,
} from "@/components/ui/map";
import { Car, Home, Store, User } from "lucide-react";
import { fetchOsrmRoute, haversineKm } from "@/lib/utils/geo-client";

interface DeliveryMapProps {
  restaurantName: string;
  restaurantAddress: string;
  restaurantLng: number;
  restaurantLat: number;
  customerName: string;
  customerAddress: string;
  customerLng: number;
  customerLat: number;
  distance: string;
  estimatedTime: string;
  departureTime: string;
  departureDate: string;
  arrivalTime: string;
  arrivalDate: string;
}

export function DeliveryMap({
  restaurantName,
  restaurantAddress,
  restaurantLng,
  restaurantLat,
  customerName,
  customerAddress,
  customerLng,
  customerLat,
  distance: initialDistance,
  estimatedTime: initialEstimatedTime,
  departureTime,
  departureDate,
  arrivalTime,
  arrivalDate,
}: DeliveryMapProps) {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([
    [restaurantLng, restaurantLat],
    [customerLng, customerLat],
  ]);
  const [distance, setDistance] = useState(initialDistance);
  const [estimatedTime, setEstimatedTime] = useState(initialEstimatedTime);

  useEffect(() => {
    let mounted = true;
    async function fetchRoute() {
      try {
        const res = await fetchOsrmRoute(restaurantLng, restaurantLat, customerLng, customerLat);
        
        if (mounted) {
          if (res) {
            setRouteCoords(res.geometrie);
            setDistance(`${res.distanceKm.toFixed(1)} km`);
            setEstimatedTime(`${res.dureeMinutes} min`);
          } else {
            // Fallback Haversine si OSRM indisponible
            const dist = haversineKm(restaurantLat, restaurantLng, customerLat, customerLng);
            const time = Math.ceil((dist / 25) * 60); // ~25 km/h moto Abidjan
            setDistance(`${dist.toFixed(1)} km`);
            setEstimatedTime(`${time} min`);
          }
        }
      } catch (err) {
        console.error("Erreur lors du chargement de l'itinéraire:", err);
      }
    }
    fetchRoute();
    return () => {
      mounted = false;
    };
  }, [restaurantLat, restaurantLng, customerLat, customerLng]);

  return (
    <Card className="border border-border/60 shadow-sm rounded-2xl overflow-hidden flex flex-col py-0 h-2/3">
      <CardContent className="p-0 flex-1 flex flex-col">
        {/* Map Container */}
        <div className="relative flex-1 min-h-70">
          <Map
            className="absolute inset-0"
            center={[
              (restaurantLng + customerLng) / 2,
              (restaurantLat + customerLat) / 2,
            ]}
            zoom={12}
          >
            <MapControls showZoom showFullscreen position="bottom-right" />
            <MapMarker longitude={restaurantLng} latitude={restaurantLat}>
              <MarkerContent>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2d7d46] text-white shadow-md ring-2 ring-white">
                  <Store className="h-3.5 w-3.5" />
                </div>
              </MarkerContent>
              <MarkerLabel position="bottom">
                <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold shadow">
                  {restaurantName}
                </span>
              </MarkerLabel>
            </MapMarker>
            <MapMarker longitude={customerLng} latitude={customerLat}>
              <MarkerContent>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background shadow-md ring-2 ring-white">
                  <Home className="h-3.5 w-3.5" />
                </div>
              </MarkerContent>
              <MarkerLabel position="bottom">
                <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold shadow">
                  {customerName}
                </span>
              </MarkerLabel>
            </MapMarker>
            <MapRoute
              coordinates={routeCoords}
              color="#2d7d46"
              width={3}
              dashArray={routeCoords.length > 2 ? undefined : [2, 2]}
            />
          </Map>
        </div>

        {/* Delivery info */}
        <div className="p-5 space-y-6 bg-white shrink-0">
          {/* Route summary */}
          <div className="">
            <div className="flex">
              <div className="flex-1">
                <p className="font-bold text-[13px]">{restaurantName}</p>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5" />
                  {restaurantAddress}
                </p>
              </div>
              <div className="justify-end items-end text-right">
                <p className="font-bold text-[13px]">{customerName}</p>
                <p className="text-xs text-muted-foreground mt-0.5 flex justify-end items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {customerAddress}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center w-full shrink-0 justify-self-center">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground mb-3 justify-between">
                <span>{distance}</span>
                <span>~</span>
                <span>{estimatedTime}</span>
              </div>
              <div className="relative w-full flex items-center">
                <div className="h-0.75 w-full bg-green-900 rounded-full" />
                <div className="absolute -left-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-white text-green-900 shadow-sm">
                  <Store className="h-3.5 w-3.5" />
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-green-900 text-white shadow-sm">
                  <Car className="h-4 w-4" />
                </div>
                <div className="absolute -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-white text-green-900 shadow-sm">
                  <Home className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>


          </div>

          {/* Times */}
          <div className="flex justify-between text-[12px] pt-2 border-t border-border/60">
            <div>
              <p className="text-muted-foreground mb-1">Heure de livraison</p>
              <p className="font-bold text-[13px] text-foreground">
                {departureTime}, {departureDate}
              </p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground mb-1">Arrivée estimée</p>
              <p className="font-bold text-[13px] text-foreground">
                {arrivalTime}, {arrivalDate}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
