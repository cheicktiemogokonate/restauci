"use client";

import type { RestaurantDetail } from "@/lib/client-app/hooks/use-restaurant-detail";
import { useRestaurantMenu } from "@/lib/client-app/hooks/use-restaurant-menu";
import type { RestaurantProche } from "@/lib/client-app/hooks/use-restaurants-proches";
import { usePanierStore } from "@/lib/client-app/stores/panier-store";
import { formatPrix } from "@/lib/utils/format";
import { Drawer } from "vaul";

interface RestaurantBottomSheetProps {
  isOpen: boolean;
  slug: string | null;
  restaurant: RestaurantDetail | null;
  previewRestaurant?: RestaurantProche | null;
  isLoading: boolean;
  showRoute?: boolean;
  onToggleRoute: () => void;
  onClose: () => void;
}

export function RestaurantBottomSheet({
  isOpen,
  slug,
  restaurant,
  previewRestaurant,
  isLoading,
  showRoute,
  onToggleRoute,
  onClose,
}: RestaurantBottomSheetProps) {
  const { categories } = useRestaurantMenu(slug);

  const ajouterItem = usePanierStore((s) => s.ajouterItem);
  const items = usePanierStore((s) => s.items);

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/30 z-30" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-3xl max-h-[90vh] flex flex-col outline-none">
          <Drawer.Title className="sr-only">
            {(restaurant?.nom ?? previewRestaurant?.nom)
              ? `${restaurant?.nom ?? previewRestaurant?.nom} — Détail`
              : "Détail du restaurant"}
          </Drawer.Title>
          {/* Poignee de drag */}
          <div className="shrink-0 flex justify-center pt-3 pb-1">
            <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
          </div>

          {!restaurant && !previewRestaurant ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-5 pb-6">
              {/* Header restaurant */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
                  {(restaurant?.logoUrl ?? previewRestaurant?.logoUrl) ? (
                    <img
                      src={
                        restaurant?.logoUrl ?? previewRestaurant?.logoUrl ?? ""
                      }
                      alt={restaurant?.nom ?? previewRestaurant?.nom ?? ""}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      {(restaurant?.nom ?? previewRestaurant?.nom ?? "")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">
                    {restaurant?.nom ?? previewRestaurant?.nom}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {restaurant?.cuisines?.join(" · ") ?? ""}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-sm">
                    {restaurant?.noteMoyenne && (
                      <span className="flex items-center gap-1 font-semibold text-gray-700">
                        ⭐ {restaurant?.noteMoyenne}
                      </span>
                    )}
                    {(restaurant?.geo ?? previewRestaurant) && (
                      <span className="text-gray-500">
                        {restaurant?.geo?.distanceKm ??
                          previewRestaurant?.distanceKm}{" "}
                        km
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Temps d'attente */}
              {restaurant?.tempsAttente && (
                <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2.5 mb-4">
                  <span className="text-lg">⏱</span>
                  <div>
                    <p className="text-sm font-semibold text-green-800">
                      {restaurant?.tempsAttente?.label}
                    </p>
                    <p className="text-xs text-green-600">
                      Temps d'attente evalue
                    </p>
                  </div>
                </div>
              )}

              {restaurant?.geo?.itineraire && (
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-4 text-sm text-gray-500 px-1">
                    <span className="flex items-center gap-1.5">
                      {restaurant?.geo?.itineraire?.distanceKm} km de route
                    </span>
                    <span className="flex items-center gap-1.5">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {restaurant?.geo?.itineraire?.dureeMinutes} min de trajet
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleRoute}
                    className="w-full rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors"
                    style={{
                      borderColor: showRoute ? "#15803d" : "#d1d5db",
                      backgroundColor: showRoute ? "#ecfdf5" : "#ffffff",
                      color: showRoute ? "#166534" : "#111827",
                    }}
                  >
                    {showRoute
                      ? "Masquer l'itinéraire"
                      : "Afficher l'itinéraire"}
                  </button>
                </div>
              )}

              {restaurant?.accepteCommandes === false && (
                <div className="bg-red-50 text-red-700 text-sm rounded-xl px-3 py-2.5 mb-4">
                  Ce restaurant n'accepte pas de commandes pour le moment
                </div>
              )}

              {/* Menu */}
              <div className="space-y-5">
                {categories.map((cat) => (
                  <div key={cat.id}>
                    <h3 className="text-sm font-bold text-gray-900 mb-2.5">
                      {cat.nom}
                    </h3>
                    <div className="space-y-2.5">
                      {cat.plats
                        .filter((p) => p.disponible)
                        .map((plat) => (
                          <PlatLigne
                            key={plat.id}
                            plat={plat}
                            quantiteActuelle={
                              items.find((i) => i.platId === plat.id)
                                ?.quantite ?? 0
                            }
                            onAjouter={() =>
                              ajouterItem(
                                {
                                  id:
                                    restaurant?.id ??
                                    previewRestaurant?.id ??
                                    "",
                                  nom:
                                    restaurant?.nom ??
                                    previewRestaurant?.nom ??
                                    "",
                                  slug:
                                    restaurant?.slug ??
                                    previewRestaurant?.slug ??
                                    "",
                                },
                                {
                                  platId: plat.id,
                                  nom: plat.nom,
                                  prix: plat.prix,
                                  photoUrl: plat.photoUrl,
                                },
                              )
                            }
                          />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function PlatLigne({
  plat,
  quantiteActuelle,
  onAjouter,
}: {
  plat: {
    id: string;
    nom: string;
    description?: string | null;
    prix: number;
    photoUrl?: string | null;
    disponible: boolean;
  };
  quantiteActuelle: number;
  onAjouter: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
        {plat.photoUrl ? (
          <img
            src={plat.photoUrl}
            alt={plat.nom}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg">
            <img src={"restaurant_exterior_night_1781800314693.jpg"} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {plat.nom}
        </p>
        {plat.description && (
          <p className="text-xs text-gray-400 truncate">{plat.description}</p>
        )}
        <p className="text-sm font-bold text-gray-900 mt-0.5">
          {formatPrix(plat.prix)}
        </p>
      </div>
      <button
        type="button"
        onClick={onAjouter}
        className="relative w-9 h-9 bg-green-700 hover:bg-green-800 rounded-full flex items-center justify-center shrink-0 transition-colors"
        aria-label={`Ajouter ${plat.nom}`}
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
        {quantiteActuelle > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {quantiteActuelle}
          </span>
        )}
      </button>
    </div>
  );
}
