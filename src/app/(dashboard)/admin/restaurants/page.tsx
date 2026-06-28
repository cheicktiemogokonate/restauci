import { getAdminSession } from "@/lib/auth/get-admin-session";
import { getRestaurantsAdmin, getRestaurantsCountsAdmin } from "@/lib/db/queries-admin";
import { parsePage } from "@/lib/config/pagination";
import { RestaurantsAdminTable } from "@/components/admin/restaurants-admin-table";
import { Store } from "lucide-react";

interface SearchParams {
  statut?: string;
  search?: string;
  page?: string;
}

export default async function AdminRestaurantsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await getAdminSession();

  const awaitedParams = await searchParams;
  const page = parsePage(awaitedParams.page);
  const statut = (awaitedParams.statut ?? "tous") as "en_attente" | "actif" | "suspendu" | "tous";

  const [{ items, total, totalPages }, counts] = await Promise.all([
    getRestaurantsAdmin({ statut, search: awaitedParams.search, page, limit: 20 }),
    getRestaurantsCountsAdmin(),
  ]);

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-[#FAFAFA] min-h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restaurants</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gérez les restaurants partenaires de la plateforme
          </p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-xl shadow-sm">
          <Store className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">
            {counts?.total ?? 0} restaurants
          </span>
        </div>
      </div>

      <RestaurantsAdminTable
        items={items}
        total={total}
        page={page}
        totalPages={totalPages}
        counts={counts}
        statutActif={statut}
        search={awaitedParams.search}
      />
    </div>
  );
}
