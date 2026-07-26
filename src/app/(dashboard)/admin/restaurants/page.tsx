import { getAdminSession } from "@/lib/auth/get-admin-session";
import { getRestaurantsAdmin, getRestaurantsCountsAdmin } from "@/lib/db/queries-admin";
import { parsePage } from "@/lib/config/pagination";
import { RestaurantsAdminTable } from "@/components/admin/restaurants-admin-table";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminPage } from "@/components/admin/ui/admin-page";
import { Store } from "lucide-react";

interface SearchParams {
  statut?: string;
  search?: string;
  page?: string;
}

export default async function AdminRestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await getAdminSession();

  const awaitedParams = await searchParams;
  const page = parsePage(awaitedParams.page);
  const statutsValides = new Set([
    "en_attente",
    "actif",
    "suspendu",
    "rejete",
    "tous",
  ]);
  const statut = statutsValides.has(awaitedParams.statut ?? "tous")
    ? (awaitedParams.statut ?? "tous") as
        | "en_attente"
        | "actif"
        | "suspendu"
        | "rejete"
        | "tous"
    : "tous";

  const [{ items, total, totalPages }, counts] = await Promise.all([
    getRestaurantsAdmin({ statut, search: awaitedParams.search, page, limit: 20 }),
    getRestaurantsCountsAdmin(),
  ]);

  return (
    <AdminPage>
      <PageHeader
        title="Restaurants"
        description="Gérez les restaurants partenaires de la plateforme"
        action={<div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
          <Store className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">
            {counts?.total ?? 0} restaurants
          </span>
        </div>}
      />

      <RestaurantsAdminTable
        items={items}
        total={total}
        page={page}
        totalPages={totalPages}
        counts={counts}
        statutActif={statut}
        search={awaitedParams.search}
      />
    </AdminPage>
  );
}
