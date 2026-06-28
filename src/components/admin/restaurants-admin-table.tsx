"use client";

import type { Restaurant } from "@/lib/db/types";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ShoppingBag,
  Star,
  Store,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface RestaurantsAdminTableProps {
  items: Pick<
    Restaurant,
    | "id"
    | "nom"
    | "slug"
    | "telephone"
    | "ville"
    | "actif"
    | "suspendu"
    | "enLigne"
    | "nombreCommandes"
    | "noteMoyenne"
    | "createdAt"
  >[];
  total: number;
  page: number;
  totalPages: number;
  counts?: {
    enAttente: number;
    actifs: number;
    suspendus: number;
    total: number;
  };
  statutActif: string;
  search?: string;
}

const TABS = [
  { value: "tous", label: "Tous" },
  { value: "en_attente", label: "En attente" },
  { value: "actif", label: "Actifs" },
  { value: "suspendu", label: "Suspendus" },
];

function StatutBadge({
  actif,
  suspendu,
}: {
  actif: boolean;
  suspendu: boolean;
}) {
  if (suspendu)
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
        Suspendu
      </span>
    );
  if (actif)
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
        Actif
      </span>
    );
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
      En attente
    </span>
  );
}

export function RestaurantsAdminTable({
  items,
  total,
  page,
  totalPages,
  counts,
  statutActif,
  search,
}: RestaurantsAdminTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(search ?? "");

  const navigate = (params: URLSearchParams) =>
    router.push(`?${params.toString()}`);

  const changeTab = (statut: string) => {
    const params = new URLSearchParams(searchParams.toString());
    statut === "tous" ? params.delete("statut") : params.set("statut", statut);
    params.delete("page");
    navigate(params);
  };

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    searchValue ? params.set("search", searchValue) : params.delete("search");
    params.delete("page");
    navigate(params);
  };

  const getCount = (tab: string) => {
    if (!counts) return null;
    return (
      {
        tous: counts.total,
        en_attente: counts.enAttente,
        actif: counts.actifs,
        suspendu: counts.suspendus,
      }[tab] ?? null
    );
  };

  return (
    <div className="space-y-5">
      {/* Tabs + Recherche */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl w-fit">
          {TABS.map((tab) => {
            const count = getCount(tab.value);
            const isActive = statutActif === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => changeTab(tab.value)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                {count !== null && (
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Rechercher un restaurant..."
              className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 w-64"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
          >
            Chercher
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                Restaurant
              </th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">
                Ville
              </th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                Statut
              </th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider hidden lg:table-cell">
                Commandes
              </th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider hidden lg:table-cell">
                Note
              </th>
              <th className="text-right px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((r) => (
              <tr
                key={r.id}
                className="hover:bg-gray-50/50 transition-colors group"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center shrink-0">
                      <Store className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div>
                      <Link
                        href={`/admin/restaurants/${r.id}`}
                        className="font-semibold text-gray-900 hover:text-emerald-700 transition-colors"
                      >
                        {r.nom}
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {r.telephone}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-gray-600 hidden md:table-cell">
                  {r.ville ?? "—"}
                </td>
                <td className="px-5 py-4">
                  <StatutBadge actif={r.actif} suspendu={r.suspendu} />
                </td>
                <td className="px-5 py-4 hidden lg:table-cell">
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <ShoppingBag className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-medium">{r.nombreCommandes}</span>
                  </div>
                </td>
                <td className="px-5 py-4 hidden lg:table-cell">
                  {r.noteMoyenne ? (
                    <div className="flex items-center gap-1 text-amber-600">
                      <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
                      <span className="font-semibold text-gray-800">
                        {r.noteMoyenne}
                      </span>
                      <span className="text-gray-400">/5</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    href={`/admin/restaurants/${r.id}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
                  >
                    Gérer <ChevronRight className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Store className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">Aucun restaurant trouvé</p>
            <p className="text-gray-400 text-xs mt-1">
              Essayez de modifier vos filtres
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            <span className="font-medium text-gray-800">{total}</span> résultats
            · page <span className="font-medium text-gray-800">{page}</span> /{" "}
            {totalPages}
          </p>
          <div className="flex gap-1.5">
            {page > 1 && (
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("page", String(page - 1));
                  navigate(params);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Précédent
              </button>
            )}
            {page < totalPages && (
              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("page", String(page + 1));
                  navigate(params);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
              >
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
