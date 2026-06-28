"use client";

import { PanierFlottant } from "@/components/client-app/panier-flottant";
import { useGeolocation } from "@/lib/client-app/hooks/use-geolocation";
import { useRestaurantDetail } from "@/lib/client-app/hooks/use-restaurant-detail";
import { useRestaurantMenu } from "@/lib/client-app/hooks/use-restaurant-menu";
import { usePanierStore } from "@/lib/client-app/stores/panier-store";
import { formatPrix } from "@/lib/utils/format";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";

const RestaurantMap = dynamic(
  () =>
    import("@/components/client-app/restaurant-map").then(
      (mod) => mod.RestaurantMap,
    ),
  { ssr: false },
);

export default function RestaurantDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const geo = useGeolocation();

  const { restaurant, isLoading } = useRestaurantDetail(
    params.slug,
    geo.lat,
    geo.lng,
  );
  const { categories } = useRestaurantMenu(params.slug);
  const ajouterItem = usePanierStore((s) => s.ajouterItem);

  if (isLoading || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Bannière */}
      <div className="relative h-48 bg-gray-100">
        {restaurant.banniereUrl && (
          <img
            src={restaurant.banniereUrl}
            alt={restaurant.nom}
            className="w-full h-full object-cover"
          />
        )}
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center"
        >
          <svg
            className="w-5 h-5 text-gray-700"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </button>
      </div>

      <div className="px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900">{restaurant.nom}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {restaurant.cuisines?.join(" · ")}
        </p>

        <div className="flex items-center gap-3 mt-2 text-sm">
          {restaurant.noteMoyenne && <span>⭐ {restaurant.noteMoyenne}</span>}
          <span className="text-green-700 font-semibold">
            {restaurant.tempsAttente.label}
          </span>
          {restaurant.geo && (
            <span className="text-gray-500">
              {restaurant.geo.distanceKm} km
            </span>
          )}
        </div>

        {/* Carte — toujours visible, itinéraire tracé si disponible */}
        <div className="mt-4 h-40 rounded-2xl overflow-hidden border border-gray-100">
          <RestaurantMap
            centerLat={geo.lat}
            centerLng={geo.lng}
            restaurants={[
              {
                id: restaurant.id,
                slug: restaurant.slug,
                nom: restaurant.nom,
                latitude: restaurant.latitude,
                longitude: restaurant.longitude,
                logoUrl: restaurant.logoUrl,
              },
            ]}
            selectedId={restaurant.id}
            showRoute={!!(restaurant.geo?.itineraire?.geometrie?.length)}
            itineraire={
              restaurant.geo?.itineraire
                ? {
                    geometrie: (restaurant.geo.itineraire.geometrie ?? []) as [number, number][],
                    distanceKm: restaurant.geo.itineraire.distanceKm,
                    dureeMinutes: restaurant.geo.itineraire.dureeMinutes,
                  }
                : null
            }
            onSelectRestaurant={() => {}}
          />
        </div>

        <div className="mt-6 space-y-5">
          {categories.map((cat) => (
            <div key={cat.id}>
              <h2 className="text-sm font-bold text-gray-900 mb-2.5">
                {cat.nom}
              </h2>
              <div className="space-y-3">
                {cat.plats
                  .filter((p) => p.disponible)
                  .map((plat) => (
                    <div key={plat.id} className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                        {plat.photoUrl ? (
                          <img
                            src={plat.photoUrl}
                            alt={plat.nom}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            🍽
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {plat.nom}
                        </p>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">
                          {formatPrix(plat.prix)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          ajouterItem(
                            {
                              id: restaurant.id,
                              nom: restaurant.nom,
                              slug: restaurant.slug,
                            },
                            {
                              platId: plat.id,
                              nom: plat.nom,
                              prix: plat.prix,
                              photoUrl: plat.photoUrl,
                            },
                          )
                        }
                        className="w-9 h-9 bg-green-700 rounded-full flex items-center justify-center shrink-0"
                      >
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 4.5v15m7.5-7.5h-15"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <PanierFlottant />
    </div>
  );
}
