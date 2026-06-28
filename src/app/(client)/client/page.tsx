"use client";

import { ClientTopBar } from "@/components/client-app/client-top-bar";
import { PanierFlottant } from "@/components/client-app/panier-flottant";
import { RestaurantBottomSheet } from "@/components/client-app/restaurant-bottom-sheet";
import { type RestaurantMapPin } from "@/components/client-app/restaurant-map";
import { useDebounce } from "@/lib/client-app/hooks/use-debounce";
import { useGeolocation } from "@/lib/client-app/hooks/use-geolocation";
import { useRestaurantDetail } from "@/lib/client-app/hooks/use-restaurant-detail";
import {
  useRestaurantsProches,
  type RestaurantProche,
} from "@/lib/client-app/hooks/use-restaurants-proches";
import dynamic from "next/dynamic";
import { useState } from "react";

// Lazy-load the map component — MapLibre GL is ~1 MB, no need to block initial paint
const RestaurantMap = dynamic(
  () =>
    import("@/components/client-app/restaurant-map").then(
      (mod) => mod.RestaurantMap,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-green-700" />
          <p className="text-sm text-gray-500">Chargement de la carte…</p>
        </div>
      </div>
    ),
  },
);

export default function AccueilClientPage() {
  const geo = useGeolocation();
  const [search, setSearch] = useState("");
  const [cuisine, setCuisine] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 400);
  const { restaurants, isLoading } = useRestaurantsProches({
    lat: geo.lat,
    lng: geo.lng,
    search: debouncedSearch || undefined,
    cuisine: cuisine || undefined,
  });

  const [selectedRestaurant, setSelectedRestaurant] =
    useState<RestaurantProche | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [showRoute, setShowRoute] = useState(false);

  // Charge le detail complet (avec geometrie OSRM) du restaurant
  // selectionne, pour pouvoir tracer l'itineraire sur la carte
  const { restaurant: selectedDetail, isLoading: isDetailLoading } =
    useRestaurantDetail(selectedRestaurant?.slug ?? null, geo.lat, geo.lng);

  const itineraire = selectedDetail?.geo?.itineraire
    ? {
        geometrie: selectedDetail.geo.itineraire.geometrie ?? [],
        distanceKm: selectedDetail.geo.itineraire.distanceKm,
        dureeMinutes: selectedDetail.geo.itineraire.dureeMinutes,
      }
    : null;

  const pins: RestaurantMapPin[] = restaurants.map((r) => ({
    id: r.id,
    slug: r.slug,
    nom: r.nom,
    latitude: r.latitude,
    longitude: r.longitude,
    logoUrl: r.logoUrl,
    distanceKm: r.distanceKm,
  }));

  const handleSelectPin = (pin: RestaurantMapPin) => {
    const restaurant = restaurants.find((r) => r.id === pin.id);
    if (restaurant) {
      if (selectedRestaurant?.id !== restaurant.id) {
        setSelectedRestaurant(restaurant);
        setShowRoute(false);
      }
      setIsBottomSheetOpen(true);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Carte plein ecran */}
      <RestaurantMap
        centerLat={geo.lat}
        centerLng={geo.lng}
        restaurants={pins}
        selectedId={selectedRestaurant?.id ?? null}
        itineraire={itineraire}
        showRoute={showRoute}
        onSelectRestaurant={handleSelectPin}
      />

      {/* Barre du haut */}
      <ClientTopBar
        geoStatus={geo.status}
        onDemanderGeolocation={geo.demander}
        nombreResultats={restaurants.length}
        isLoading={isLoading}
        search={search}
        onSearchChange={setSearch}
        cuisine={cuisine}
        onCuisineChange={setCuisine}
      />

      {/* Panier flottant */}
      <PanierFlottant />

      {/* Bottom sheet */}
      <RestaurantBottomSheet
        isOpen={isBottomSheetOpen}
        slug={selectedRestaurant?.slug ?? null}
        restaurant={selectedDetail}
        previewRestaurant={selectedRestaurant}
        isLoading={isDetailLoading}
        showRoute={showRoute}
        onToggleRoute={() => setShowRoute((value) => !value)}
        onClose={() => setIsBottomSheetOpen(false)}
      />
    </div>
  );
}
