import { getAdminSession } from "@/lib/auth/get-admin-session";
import { getCommissionsParRestaurantAdmin } from "@/lib/db/queries-admin";
import { formatPrix } from "@/lib/utils/format";
import {
  ArrowRight,
  BadgeDollarSign,
  ShoppingBag,
  Store,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";

export default async function AdminCommissionsPage() {
  await getAdminSession();

  const parRestaurant = await getCommissionsParRestaurantAdmin();
  const totalDu = parRestaurant.reduce(
    (sum, r) => sum + Number(r.montantDu),
    0,
  );
  const totalCommandes = parRestaurant.reduce(
    (sum, r) => sum + Number(r.nombreCommandes),
    0,
  );
  const maxMontant = Math.max(
    ...parRestaurant.map((r) => Number(r.montantDu)),
    1,
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-[#FAFAFA] min-h-full">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Commissions</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Suivi des commissions dues par les restaurants partenaires
        </p>
      </div>

      {/* KPIs résumé */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl">
              <Wallet className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatPrix(totalDu)}
          </p>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Total en attente de paiement
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <Store className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {parRestaurant.length}
          </p>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Restaurants concernés
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 bg-purple-50 rounded-xl">
              <ShoppingBag className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {totalCommandes.toLocaleString("fr-FR")}
          </p>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Commandes facturées
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            Détail par restaurant
          </h2>
          <span className="text-xs text-gray-500 bg-amber-50 border border-amber-100 text-amber-700 font-semibold px-2.5 py-1 rounded-full">
            {parRestaurant.length} restaurants
          </span>
        </div>

        {parRestaurant.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <BadgeDollarSign className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">
              Aucune commission en attente
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Tout a été reversé aux partenaires
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                  Restaurant
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider hidden sm:table-cell">
                  Commandes
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                  Montant dû
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider hidden md:table-cell w-64">
                  Proportion
                </th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                  Détail
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {parRestaurant.map((r) => {
                const pct = Math.round(
                  (Number(r.montantDu) / maxMontant) * 100,
                );
                return (
                  <tr
                    key={r.restaurantId}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center shrink-0">
                          <Store className="w-4 h-4 text-emerald-700" />
                        </div>
                        <Link
                          href={`/admin/restaurants/${r.restaurantId}`}
                          className="font-semibold text-gray-900 hover:text-emerald-700 transition-colors"
                        >
                          {r.restaurantNom}
                        </Link>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <ShoppingBag className="w-3.5 h-3.5 text-gray-400" />
                        <span className="font-medium">{r.nombreCommandes}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-gray-900 text-base">
                        {formatPrix(Number(r.montantDu))}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-500 w-8 text-right">
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/restaurants/${r.restaurantId}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
                      >
                        Voir <ArrowRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Total footer */}
        {parRestaurant.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Total à reverser
            </span>
            <span className="text-lg font-bold text-gray-900">
              {formatPrix(totalDu)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
