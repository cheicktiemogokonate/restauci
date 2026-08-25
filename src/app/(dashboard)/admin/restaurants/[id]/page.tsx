import { RestaurantDetailAdmin } from "@/components/admin/restaurant-detail-admin";
import { getAdminSession } from "@/lib/auth/get-admin-session";
import { parsePage } from "@/lib/config/pagination";
import {
  getCommandesRestaurantAdmin,
  getEvolutionRestaurantAdmin,
  getRestaurantDetailAdmin,
} from "@/lib/db/queries-admin";
import type { StatutCommande } from "@/lib/db/types";
import { notFound } from "next/navigation";
import { PaystackProviderAccountCard } from "@/components/admin/paystack-provider-account-card";
import { getPaystackProviderAccount } from "@/modules/transactions/provider-accounts";

export default async function AdminRestaurantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; statut?: string }>;
}) {
  await getAdminSession();

  const { id } = await params;

  const restaurant = await getRestaurantDetailAdmin(id);
  if (!restaurant) notFound();

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

  const [commandesResult, evolution, providerAccount] = await Promise.all([
    getCommandesRestaurantAdmin({
      restaurantId: id,
      statut,
      page,
      limit: 20,
    }),
    getEvolutionRestaurantAdmin(id, 30),
    getPaystackProviderAccount(restaurant.partnerAccountId),
  ]);

  return (
    <>
      <RestaurantDetailAdmin
        restaurant={restaurant}
        commandes={commandesResult.items}
        totalCommandes={commandesResult.total}
        page={page}
        totalPages={commandesResult.totalPages}
        evolution={evolution}
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
