"use client";

import { useCommandeTracking } from "@/lib/client-app/hooks/use-commande-tracking";
import { formatPrix } from "@/lib/utils/format";
import { useParams, useRouter } from "next/navigation";

export default function SuiviCommandePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { commande, isLoading, error } = useCommandeTracking(params.id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (!commande) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-3xl border border-gray-100 bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-gray-500 mb-4">
            {error ?? "Commande introuvable."}
          </p>
          <button
            type="button"
            onClick={() => router.push("/commandes")}
            className="inline-flex items-center justify-center rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 transition"
          >
            Retour aux commandes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3.5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/commandes")}
          className="p-1"
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
        <div>
          <h1 className="text-base font-bold text-gray-900">
            Commande {commande.numero}
          </h1>
          <p className="text-xs text-gray-400">{commande.restaurant?.nom}</p>
        </div>
      </div>

      <div className="px-4 py-5 space-y-6">
        {commande.estAnnulee ? (
          <div className="bg-red-50 text-red-700 text-sm rounded-2xl px-4 py-4 text-center">
            Cette commande a été annulée
          </div>
        ) : (
          <>
            {/* Statut principal */}
            <div className="text-center py-4">
              <p className="text-2xl font-bold text-gray-900">
                {commande.statutLabel}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Commande {commande.numero}
              </p>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="space-y-0">
                {commande.timeline.map((etape, i) => (
                  <div key={etape.etape} className="flex items-start gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center ${
                          etape.fait
                            ? "bg-green-600"
                            : etape.actif
                              ? "bg-white border-2 border-green-600"
                              : "bg-white border-2 border-gray-200"
                        }`}
                      >
                        {etape.fait && (
                          <svg
                            className="w-3.5 h-3.5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4.5 12.75l6 6 9-13.5"
                            />
                          </svg>
                        )}
                      </div>
                      {i < commande.timeline.length - 1 && (
                        <div
                          className={`w-0.5 h-10 ${etape.fait ? "bg-green-500" : "bg-gray-200"}`}
                        />
                      )}
                    </div>
                    <div className="pb-8">
                      <p
                        className={`text-sm font-semibold ${etape.fait || etape.actif ? "text-gray-900" : "text-gray-400"}`}
                      >
                        {etape.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Détail commande */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Détail</p>
          {commande.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span className="text-gray-600">
                {item.quantite}× {item.nom}
              </span>
              <span className="text-gray-900">
                {formatPrix(item.prix * item.quantite)}
              </span>
            </div>
          ))}
          <div className="border-t border-gray-100 mt-2 pt-2 flex justify-between">
            <span className="text-sm font-bold text-gray-900">Total</span>
            <span className="text-sm font-bold text-green-700">
              {formatPrix(commande.total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
