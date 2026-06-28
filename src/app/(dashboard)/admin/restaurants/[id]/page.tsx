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

export default async function AdminRestaurantDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { page?: string; statut?: string };
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

  const [commandesResult, evolution] = await Promise.all([
    getCommandesRestaurantAdmin({
      restaurantId: id,
      statut,
      page,
      limit: 20,
    }),
    getEvolutionRestaurantAdmin(id, 30),
  ]);

  return (
    <RestaurantDetailAdmin
      restaurant={restaurant}
      commandes={commandesResult.items}
      totalCommandes={commandesResult.total}
      page={page}
      totalPages={commandesResult.totalPages}
      evolution={evolution}
    />
  );
}
