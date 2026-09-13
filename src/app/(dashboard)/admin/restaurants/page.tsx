import { getAdminSession } from "@/modules/auth/server";
import {
  getAdminRestaurantCounts,
  listAdminRestaurants,
} from "@/modules/restaurants/server";
import { getEffectiveSubscriptionSummaries } from "@/modules/subscriptions/server";
import { parsePage } from "@/shared/pagination";
import { RestaurantsAdminTable } from "@/modules/restaurants/presentation/admin-restaurants-table";
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

  const [restaurants, counts] = await Promise.all([
    listAdminRestaurants({ statut, search: awaitedParams.search, page, limit: 20 }),
    getAdminRestaurantCounts(),
  ]);
  const subscriptions = await getEffectiveSubscriptionSummaries(
    restaurants.items.map((restaurant) => restaurant.partnerAccountId),
  );
  const subscriptionByAccount = new Map(
    subscriptions.map((subscription) => [
      subscription.partnerAccountId,
      subscription,
    ]),
  );
  const items = restaurants.items.map((restaurant) => {
    const subscription = subscriptionByAccount.get(restaurant.partnerAccountId)!;
    return {
      ...restaurant,
      planCode: subscription.plan.code,
      planNom: subscription.plan.name,
      statutAbonnement: subscription.period?.status ?? null,
      dateEcheance: subscription.period?.expiresAt ?? null,
      tauxCommissionBpsFige: subscription.plan.rateBps,
    };
  });

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
        total={restaurants.total}
        page={page}
        totalPages={restaurants.totalPages}
        counts={counts}
        statutActif={statut}
        search={awaitedParams.search}
      />
    </AdminPage>
  );
}
