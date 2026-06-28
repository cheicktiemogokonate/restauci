"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clientApi } from "@/lib/client-app/api-client";
import { formatPrix, formatDate } from "@/lib/utils/format";

interface CommandeHistorique {
  id:           string;
  numero:       string;
  statut:       string;
  total:        number;
  modeCommande: string;
  createdAt:    string;
}

export default function HistoriqueCommandesPage() {
  const [commandes, setCommandes] = useState<CommandeHistorique[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    clientApi
      .get<CommandeHistorique[]>("/commandes?limit=20")
      .then((result) => {
        if (result.success && result.data) setCommandes(result.data);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen px-4 py-5">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Mes commandes</h1>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-green-700 rounded-full animate-spin" />
        </div>
      ) : commandes.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">
          Aucune commande pour le moment
        </p>
      ) : (
        <div className="space-y-3">
          {commandes.map((c) => (
            <Link
              key={c.id}
              href={`/commandes/${c.id}`}
              className="block bg-white rounded-2xl border border-gray-100 p-4"
            >
              <div className="flex justify-between items-start mb-1">
                <p className="text-sm font-bold text-gray-900">{c.numero}</p>
                <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 rounded-full">
                  {c.statut}
                </span>
              </div>
              <p className="text-xs text-gray-400">{formatDate(c.createdAt)}</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{formatPrix(c.total)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}