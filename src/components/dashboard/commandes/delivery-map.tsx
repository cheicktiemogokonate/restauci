"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Map,
  MapControls,
  MapMarker,
  MapRoute,
  MarkerContent,
  MarkerLabel,
} from "@/components/ui/map";
import {
  fetchOsrmRoute,
  geocodeAddress,
  haversineKm,
} from "@/lib/utils/geo-client";
import { Armchair, Car, Home, PackageCheck, Store, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  modeCommande: "sur_place" | "emporter" | "livraison";
  tableNumber?: string | null;
}

function normalizePoint(
  longitude: number | null | undefined,
  latitude: number | null | undefined,
): [number, number] | null {
  const parsedLongitude =
    typeof longitude === "number" && Number.isFinite(longitude)
      ? longitude
      : null;
  const parsedLatitude =
    typeof latitude === "number" && Number.isFinite(latitude) ? latitude : null;

  if (parsedLongitude === null || parsedLatitude === null) return null;
  if (parsedLongitude === 0 && parsedLatitude === 0) return null;

  const candidate = [parsedLongitude, parsedLatitude] as [number, number];
  const isValidLatitude = parsedLatitude >= -90 && parsedLatitude <= 90;
  const isValidLongitude = parsedLongitude >= -180 && parsedLongitude <= 180;

  if (isValidLatitude && isValidLongitude) {
    return candidate;
  }

  const swappedLongitude = parsedLatitude;
  const swappedLatitude = parsedLongitude;
  const swappedIsValidLatitude =
    swappedLatitude >= -90 && swappedLatitude <= 90;
  const swappedIsValidLongitude =
    swappedLongitude >= -180 && swappedLongitude <= 180;

  if (swappedIsValidLatitude && swappedIsValidLongitude) {
    return [swappedLongitude, swappedLatitude] as [number, number];
  }

  return null;
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
  modeCommande,
  tableNumber,
}: DeliveryMapProps) {
  const isDelivery = modeCommande === "livraison";
  const destinationLabel = isDelivery
    ? customerAddress
    : modeCommande === "sur_place"
      ? `Table ${tableNumber ?? "non renseignée"}`
      : "Retrait au comptoir";
  const DestinationIcon = isDelivery
    ? User
    : modeCommande === "sur_place"
      ? Armchair
      : PackageCheck;
  const normalizedRestaurant = useMemo(
    () => normalizePoint(restaurantLng, restaurantLat),
    [restaurantLat, restaurantLng],
  );
  const normalizedCustomer = useMemo(
    () => normalizePoint(customerLng, customerLat),
    [customerLat, customerLng],
  );

  const [routeCoords, setRouteCoords] = useState<[number, number][]>(() => {
    if (normalizedRestaurant && normalizedCustomer) {
      return [normalizedRestaurant, normalizedCustomer];
    }
    return normalizedRestaurant ? [normalizedRestaurant] : [];
  });
  const [resolvedCustomer, setResolvedCustomer] = useState<[number, number] | null>(
    null,
  );
  const [distance, setDistance] = useState(initialDistance);
  const [estimatedTime, setEstimatedTime] = useState(initialEstimatedTime);

  const effectiveCustomer = normalizedCustomer ?? resolvedCustomer;

  const mapCenter = useMemo(() => {
    const points = [normalizedRestaurant, effectiveCustomer].filter(
      (point): point is [number, number] => Boolean(point),
    );

    if (points.length === 2) {
      return [
        (points[0][0] + points[1][0]) / 2,
        (points[0][1] + points[1][1]) / 2,
      ] as [number, number];
    }

    if (points.length === 1) {
      return points[0];
    }

    return [-4.0, 5.3] as [number, number];
  }, [effectiveCustomer, normalizedRestaurant]);

  useEffect(() => {
    let isCancelled = false;

    async function resolveCustomerPoint() {
      if (!isDelivery || normalizedCustomer || !customerAddress.trim()) {
        return;
      }

      const geocoded = await geocodeAddress(customerAddress);
      if (!isCancelled && geocoded) {
        setResolvedCustomer([geocoded.longitude, geocoded.latitude]);
      }
    }

    resolveCustomerPoint();
    return () => {
      isCancelled = true;
    };
  }, [customerAddress, isDelivery, normalizedCustomer]);

  useEffect(() => {
    let mounted = true;
    async function fetchRoute() {
      if (!isDelivery || !normalizedRestaurant || !effectiveCustomer) {
        return;
      }

      try {
        const res = await fetchOsrmRoute(
          normalizedRestaurant[1],
          normalizedRestaurant[0],
          effectiveCustomer[1],
          effectiveCustomer[0],
        );

        if (mounted) {
          if (res && res.geometrie.length >= 2) {
            setRouteCoords(res.geometrie);
            setDistance(`${res.distanceKm.toFixed(1)} km`);
            setEstimatedTime(`${res.dureeMinutes} min`);
          } else {
            const dist = haversineKm(
              normalizedRestaurant[1],
              normalizedRestaurant[0],
              effectiveCustomer[1],
              effectiveCustomer[0],
            );
            const time = Math.ceil((dist / 25) * 60);
            setRouteCoords([normalizedRestaurant, effectiveCustomer]);
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
  }, [effectiveCustomer, isDelivery, normalizedRestaurant]);

  return (
    <Card className="border border-border/60 shadow-sm rounded-2xl overflow-hidden flex flex-col py-0 h-2/3">
      <CardContent className="p-0 flex-1 flex flex-col">
        {/* Map Container */}
        <div className="relative flex-1 min-h-70">
          <Map className="absolute inset-0" center={mapCenter} zoom={12}>
            <MapControls showZoom showFullscreen position="bottom-right" />
            {normalizedRestaurant && (
              <MapMarker
                longitude={normalizedRestaurant[0]}
                latitude={normalizedRestaurant[1]}
              >
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
            )}
            {isDelivery && effectiveCustomer && (
              <MapMarker
                longitude={effectiveCustomer[0]}
                latitude={effectiveCustomer[1]}
              >
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
            )}
            {routeCoords.length >= 2 && (
              <MapRoute
                coordinates={routeCoords}
                color="#2d7d46"
                width={3}
                dashArray={routeCoords.length > 2 ? undefined : [2, 2]}
              />
            )}
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
                  <DestinationIcon className="h-3.5 w-3.5" />
                  {destinationLabel}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center w-full shrink-0 justify-self-center">
              {isDelivery ? (
                <div className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
                  <span>{distance}</span>
                  <span>~</span>
                  <span>{estimatedTime}</span>
                </div>
              ) : (
                <p className="mb-3 text-[12px] font-semibold text-brand-green">
                  {modeCommande === "sur_place"
                    ? "Service à table"
                    : "Commande à retirer sur place"}
                </p>
              )}
              <div className="relative w-full flex items-center">
                <div className="h-0.75 w-full bg-green-900 rounded-full" />
                <div className="absolute -left-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-white text-green-900 shadow-sm">
                  <Store className="h-3.5 w-3.5" />
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-green-900 text-white shadow-sm">
                  {isDelivery ? <Car className="h-4 w-4" /> : <DestinationIcon className="h-4 w-4" />}
                </div>
                <div className="absolute -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-white text-green-900 shadow-sm">
                  {isDelivery ? <Home className="h-3.5 w-3.5" /> : <DestinationIcon className="h-3.5 w-3.5" />}
                </div>
              </div>
            </div>
          </div>

          {/* Times */}
          <div className="flex justify-between text-[12px] pt-2 border-t border-border/60">
            <div>
              <p className="text-muted-foreground mb-1">
                {isDelivery ? "Départ estimé" : "Commande enregistrée"}
              </p>
              <p className="font-bold text-[13px] text-foreground">
                {departureTime}, {departureDate}
              </p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground mb-1">
                {isDelivery
                  ? "Arrivée estimée"
                  : modeCommande === "sur_place"
                    ? "À servir à table"
                    : "À retirer au comptoir"}
              </p>
              <p className="font-bold text-[13px] text-foreground">
                {isDelivery ? `${arrivalTime}, ${arrivalDate}` : "Dès que la commande est prête"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
