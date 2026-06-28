"use client";

import { AdresseLivraisonPicker } from "@/components/client-app/adresse-livraison-picker";
import { usePanierRestaurant } from "@/lib/client-app/hooks/use-panier-restaurant";
import { useRequireAuth } from "@/lib/client-app/hooks/use-require-auth";
import { usePanierStore } from "@/lib/client-app/stores/panier-store";
import { formatPrix } from "@/lib/utils/format";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ModeCommande = "sur_place" | "livraison" | "emporter";

export default function PanierPage() {
  const router = useRouter();
  const requireAuth = useRequireAuth();

  const items = usePanierStore((s) => s.items);
  const sousTotal = usePanierStore((s) => s.sousTotal());
  const changerQuantite = usePanierStore((s) => s.changerQuantite);
  const retirerItem = usePanierStore((s) => s.retirerItem);
  const restaurantNom = usePanierStore((s) => s.restaurantNom);
  const restaurantSlug = usePanierStore((s) => s.restaurantSlug);

  const { restaurant, isLoading } = usePanierRestaurant();

  const [modeCommande, setModeCommande] = useState<ModeCommande>("livraison");
  const [numeroTable, setNumeroTable] = useState("");
  const [adresse, setAdresse] = useState<{
    adresse: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [noteClient, setNoteClient] = useState("");

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-2xl mb-2">🛒</p>
        <p className="text-base font-semibold text-gray-900">
          Votre panier est vide
        </p>
        <p className="text-sm text-gray-500 mt-1 mb-6">
          Parcourez les restaurants pour commencer
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="px-6 py-2.5 bg-green-700 text-white text-sm font-semibold rounded-xl"
        >
          Découvrir les restaurants
        </button>
      </div>
    );
  }

  const fraisLivraison =
    modeCommande === "livraison" ? (restaurant?.fraisLivraison ?? 0) : 0;
  const total = sousTotal + fraisLivraison;

  const peutValider =
    items.length > 0 && (modeCommande !== "livraison" || adresse !== null);
  // &&
  // (!restaurant?.commandeMinimum || sousTotal >= restaurant.commandeMinimum);

  const handleValider = () => {
    requireAuth(() => {
      router.push(
        `/panier/confirmer?mode=${modeCommande}` +
          (adresse
            ? `&adresse=${encodeURIComponent(JSON.stringify(adresse))}`
            : "") +
          (numeroTable ? `&table=${encodeURIComponent(numeroTable)}` : "") +
          (noteClient ? `&note=${encodeURIComponent(noteClient)}` : ""),
      );
    });
  };

  return (
    <div className="min-h-screen pb-32">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3.5 flex items-center gap-3 z-10">
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
        <div>
          <h1 className="text-base font-bold text-gray-900">Votre panier</h1>
          <p className="text-xs text-gray-400">{restaurantNom}</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Mode de commande */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">
            Mode de commande
          </p>
          <div className="flex gap-2">
            {(["livraison", "emporter", "sur_place"] as ModeCommande[])
              .filter(
                (m) => !restaurant || restaurant.modesCommande.includes(m),
              )
              .map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setModeCommande(mode)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    modeCommande === mode
                      ? "bg-green-700 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {mode === "livraison"
                    ? "Livraison"
                    : mode === "emporter"
                      ? "À emporter"
                      : "Sur place"}
                </button>
              ))}
          </div>
        </div>

        {/* Adresse (si livraison) */}
        {modeCommande === "livraison" && (
          <AdresseLivraisonPicker value={adresse} onChange={setAdresse} />
        )}

        {/* Numéro de table (si sur place) */}
        {modeCommande === "sur_place" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <label className="text-sm font-semibold text-gray-900 block mb-2">
              Numéro de table
            </label>
            <input
              type="text"
              value={numeroTable}
              onChange={(e) => setNumeroTable(e.target.value)}
              placeholder="Ex: 12"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
            />
          </div>
        )}

        {/* Liste des articles */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Articles</p>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.platId} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  {item.photoUrl ? (
                    <img
                      src={item.photoUrl}
                      alt={item.nom}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">
                      🍽
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {item.nom}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatPrix(item.prix)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      changerQuantite(item.platId, item.quantite - 1)
                    }
                    className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600"
                  >
                    −
                  </button>
                  <span className="text-sm font-semibold w-5 text-center">
                    {item.quantite}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      changerQuantite(item.platId, item.quantite + 1)
                    }
                    className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Note pour le restaurant */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <label className="text-sm font-semibold text-gray-900 block mb-2">
            Note pour le restaurant (optionnel)
          </label>
          <textarea
            value={noteClient}
            onChange={(e) => setNoteClient(e.target.value)}
            placeholder="Ex: Pas trop épicé, merci"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm h-20 resize-none"
          />
        </div>

        {/* Récap montants */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Sous-total</span>
            <span className="text-gray-900 font-medium">
              {formatPrix(sousTotal)}
            </span>
          </div>
          {modeCommande === "livraison" && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Frais de livraison</span>
              <span className="text-gray-900 font-medium">
                {formatPrix(fraisLivraison)}
              </span>
            </div>
          )}
          <div className="border-t border-gray-100 pt-2 flex justify-between">
            <span className="text-sm font-bold text-gray-900">Total</span>
            <span className="text-base font-bold text-green-700">
              {formatPrix(sousTotal)}
            </span>
          </div>
        </div>

        {restaurant?.commandeMinimum &&
          sousTotal < restaurant.commandeMinimum && (
            <p className="text-xs text-amber-600 text-center">
              Commande minimum : {formatPrix(restaurant.commandeMinimum)}
            </p>
          )}
      </div>

      {/* Bouton valider fixe en bas */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
        <button
          type="button"
          disabled={!peutValider || isLoading}
          onClick={handleValider}
          className="w-full py-3.5 bg-green-700 text-white text-sm font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Continuer · {formatPrix(total)}
        </button>
      </div>
    </div>
  );
}
