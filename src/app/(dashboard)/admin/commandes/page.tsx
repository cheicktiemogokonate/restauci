import { CommandesAdminFilters } from "@/components/admin/commandes-admin-filters";
import { getAdminSession } from "@/lib/auth/get-admin-session";
import { parsePage } from "@/lib/config/pagination";
import { getCommandesGlobalAdmin } from "@/lib/db/queries-admin";
import type { StatutCommande } from "@/lib/db/types";
import { formatDate, formatPrix } from "@/lib/utils/format";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import Link from "next/link";

const statutStyles: Record<string, string> = {
  livree: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  en_cours: "bg-blue-50 text-blue-700 border border-blue-100",
  annulee: "bg-red-50 text-red-700 border border-red-100",
  en_attente: "bg-amber-50 text-amber-700 border border-amber-100",
};
const statutLabels: Record<string, string> = {
  livree: "Livrée",
  en_cours: "En cours",
  annulee: "Annulée",
  en_attente: "En attente",
};

export default async function AdminCommandesPage({
  searchParams,
}: {
  searchParams: { search?: string; statut?: string; page?: string };
}) {
  await getAdminSession();

  const searchParamsAwaited = await searchParams;
  const page = parsePage(searchParamsAwaited.page);

  const validStatuts = new Set<StatutCommande>([
    "recue",
    "en_preparation",
    "prete",
    "servie",
    "annulee",
  ]);
  const statut = validStatuts.has(searchParamsAwaited.statut as StatutCommande)
    ? (searchParamsAwaited.statut as StatutCommande)
    : undefined;

  const { items, total, totalPages } = await getCommandesGlobalAdmin({
    statut,
    search: searchParamsAwaited.search,
    page,
    limit: 25,
  });

  const buildUrl = (p: number) => {
    const params = new URLSearchParams();
    if (searchParamsAwaited.statut)
      params.set("statut", searchParamsAwaited.statut);
    if (searchParamsAwaited.search)
      params.set("search", searchParamsAwaited.search);
    params.set("page", String(p));
    return `?${params.toString()}`;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-[#FAFAFA] min-h-full">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Commandes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="font-semibold text-gray-800">{total}</span>{" "}
            commandes sur la plateforme
          </p>
        </div>
      </div>

      <CommandesAdminFilters
        initialSearch={searchParamsAwaited.search}
        initialStatut={searchParamsAwaited.statut}
      />

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                N° Commande
              </th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell">
                Restaurant
              </th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider hidden sm:table-cell">
                Client
              </th>
              <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                Statut
              </th>
              <th className="text-right px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                Total
              </th>
              <th className="text-right px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider hidden lg:table-cell">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50/40 transition-colors">
                <td className="px-5 py-4">
                  <span className="font-mono font-semibold text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded-lg">
                    {c.numero}
                  </span>
                </td>
                <td className="px-5 py-4 hidden md:table-cell">
                  <Link
                    href={`/admin/restaurants/${c.restaurantId}`}
                    className="font-medium text-emerald-700 hover:text-emerald-900 hover:underline transition-colors"
                  >
                    {c.restaurantNom}
                  </Link>
                </td>
                <td className="px-5 py-4 text-gray-700 hidden sm:table-cell">
                  {c.nomClient}
                </td>
                <td className="px-5 py-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statutStyles[c.statut] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {statutLabels[c.statut] ?? c.statut}
                  </span>
                </td>
                <td className="px-5 py-4 text-right font-bold text-gray-900">
                  {formatPrix(c.total)}
                </td>
                <td className="px-5 py-4 text-right text-gray-400 text-xs hidden lg:table-cell">
                  {formatDate(c.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <ShoppingBag className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">Aucune commande trouvée</p>
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
            Page <span className="font-medium text-gray-800">{page}</span> sur{" "}
            <span className="font-medium text-gray-800">{totalPages}</span> —{" "}
            {total} résultats
          </p>
          <div className="flex gap-1.5">
            {page > 1 && (
              <Link
                href={buildUrl(page - 1)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Précédent
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildUrl(page + 1)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
              >
                Suivant <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
