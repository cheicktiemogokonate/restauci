"use client";

import Link from "next/link";
import { usePanierStore } from "@/lib/client-app/stores/panier-store";
import { formatPrix } from "@/lib/utils/format";

export function PanierFlottant() {
  const items = usePanierStore((s) => s.items);
  const restaurantNom = usePanierStore((s) => s.restaurantNom);
  const sousTotal = usePanierStore((s) => s.sousTotal());
  const nombreItems = usePanierStore((s) => s.nombreItems());

  if (items.length === 0) return null;

  return (
    <Link
      href="/panier"
      className="fixed bottom-5 left-4 right-4 z-20 bg-gray-900 text-white rounded-2xl shadow-xl px-4 py-3.5 flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center font-bold text-sm">
          {nombreItems}
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Voir le panier</p>
          <p className="text-xs text-white/60">{restaurantNom}</p>
        </div>
      </div>
      <span className="text-sm font-bold">{formatPrix(sousTotal)}</span>
    </Link>
  );
}
