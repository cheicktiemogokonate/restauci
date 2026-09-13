import { RestaurantDetailAdmin } from "@/modules/restaurants/presentation/admin-restaurant-detail";
import { getAdminSession } from "@/modules/auth/server";
import { parsePage } from "@/shared/pagination";
import {
  getAdminRestaurantOrderEvolution,
  listAdminRestaurantOrders,
} from "@/modules/orders/server";
import type { RestaurantOrderStatus } from "@/modules/orders/model";
import { getAdminRestaurantDetail } from "@/modules/restaurants/server";
import { getEffectiveSubscriptionContext } from "@/modules/subscriptions/server";
import { notFound } from "next/navigation";
import { PaystackProviderAccountCard } from "@/components/admin/paystack-provider-account-card";
import { getPaystackProviderAccount } from "@/modules/transactions/server";
import {
  reactiverRestaurantAction,
  rejeterRestaurantAction,
  suspendreRestaurantAction,
  validerRestaurantAction,
} from "@/app/_actions/admin-restaurants";

export default async function AdminRestaurantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; statut?: string }>;
}) {
  await getAdminSession();

  const { id } = await params;

  const restaurant = await getAdminRestaurantDetail(id);
  if (!restaurant) notFound();

  const searchParamsAwaited = await searchParams;
  const page = parsePage(searchParamsAwaited.page);

  const validStatuts = new Set<RestaurantOrderStatus>([
    "recue",
    "en_preparation",
    "prete",
    "servie",
    "annulee",
  ]);
  const statut = validStatuts.has(searchParamsAwaited.statut as RestaurantOrderStatus)
    ? (searchParamsAwaited.statut as RestaurantOrderStatus)
    : undefined;

  const [commandesResult, evolution, providerAccount, subscription] = await Promise.all([
    listAdminRestaurantOrders({
      restaurantId: id,
      statut,
      page,
      limit: 20,
    }),
    getAdminRestaurantOrderEvolution(id, 30),
    getPaystackProviderAccount(restaurant.partnerAccountId),
    getEffectiveSubscriptionContext(restaurant.partnerAccountId),
  ]);

  return (
    <>
      <RestaurantDetailAdmin
        restaurant={{
          ...restaurant,
          effectivePlan: { plan: { nom: subscription.plan.name } },
        }}
        commandes={commandesResult.items}
        totalCommandes={commandesResult.total}
        page={page}
        totalPages={commandesResult.totalPages}
        evolution={evolution}
        actions={{
          validate: validerRestaurantAction,
          reject: rejeterRestaurantAction,
          suspend: suspendreRestaurantAction,
          reactivate: reactiverRestaurantAction,
        }}
      />
      <div className="mx-auto -mt-6 mb-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <PaystackProviderAccountCard
          resourceType="restaurant"
          resourceId={restaurant.id}
          partnerAccountId={restaurant.partnerAccountId}
          account={providerAccount ? {
            providerAccountReference: providerAccount.providerAccountReference,
            status: providerAccount.status,
            verifiedAt: providerAccount.verifiedAt,
          } : null}
        />
      </div>
    </>
  );
}
