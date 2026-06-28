"use client";

import { clientApi } from "@/lib/client-app/api-client";
import { usePanierStore } from "@/lib/client-app/stores/panier-store";
import { formatPrix } from "@/lib/utils/format";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";

function ConfirmerCommandeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const items = usePanierStore((s) => s.items);
  const sousTotal = usePanierStore((s) => s.sousTotal());
  const restaurantSlug = usePanierStore((s) => s.restaurantSlug);
  const restaurantNom = usePanierStore((s) => s.restaurantNom);
  const vider = usePanierStore((s) => s.vider);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const mode = searchParams.get("mode") as
    | "sur_place"
    | "livraison"
    | "emporter";
  const adresse = searchParams.get("adresse");
  const table = searchParams.get("table");
  const note = searchParams.get("note");

  const adresseData = adresse ? JSON.parse(decodeURIComponent(adresse)) : null;

  const handleConfirmer = () => {
    if (!restaurantSlug || items.length === 0) return;

    startTransition(async () => {
      const result = await clientApi.post<{
        commande: { id: string; numero: string };
      }>("/commandes", {
        restaurantSlug,
        modeCommande: mode,
        items: items.map((i) => ({ platId: i.platId, quantite: i.quantite })),
        ...(adresseData && {
          adresseLivraison: adresseData.adresse,
          latitudeLivraison: adresseData.lat,
          longitudeLivraison: adresseData.lng,
        }),
        ...(table && { numeroTable: table }),
        ...(note && { noteClient: note }),
      });

      if (!result.success || !result.data) {
        setError(result.error ?? "Impossible de passer la commande");
        return;
      }

      vider();
      router.push(`/commandes/${result.data.commande.id}`);
    });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-400">Panier vide</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3.5 flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="p-1">
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
        <h1 className="text-base font-bold text-gray-900">
          Confirmer la commande
        </h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-900">{restaurantNom}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {mode === "livraison"
              ? "Livraison"
              : mode === "emporter"
                ? "À emporter"
                : "Sur place"}
            {table && ` · Table ${table}`}
          </p>
          {adresseData && (
            <p className="text-xs text-gray-500 mt-1">{adresseData.adresse}</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          {items.map((item) => (
            <div
              key={item.platId}
              className="flex justify-between text-sm py-1.5"
            >
              <span className="text-gray-700">
                {item.quantite}× {item.nom}
              </span>
              <span className="text-gray-900 font-medium">
                {formatPrix(item.prix * item.quantite)}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-amber-50 text-amber-700 text-sm rounded-xl px-3 py-2.5">
          💵 Paiement à la livraison / sur place
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">
            {error}
          </p>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
        <button
          type="button"
          disabled={isPending}
          onClick={handleConfirmer}
          className="w-full py-3.5 bg-green-700 text-white text-sm font-bold rounded-xl disabled:opacity-50"
        >
          {isPending
            ? "Envoi en cours..."
            : `Confirmer · ${formatPrix(sousTotal)}`}
        </button>
      </div>
    </div>
  );
}

export default function ConfirmerCommandePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Chargement...
        </div>
      }
    >
      <ConfirmerCommandeContent />
    </Suspense>
  );
}
