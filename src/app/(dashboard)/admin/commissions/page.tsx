import {
  CommissionDetailsTable,
  RestaurantSummaryTable,
} from "@/components/admin/commissions-admin-tables";
import { CommissionsAdminFilters } from "@/components/admin/commissions-admin-filters";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminPage } from "@/components/admin/ui/admin-page";
import { StatCard } from "@/components/admin/ui/stat-card";
import { Button } from "@/components/ui/button";
import { getAdminSession } from "@/lib/auth/get-admin-session";
import { parsePage } from "@/lib/config/pagination";
import { getCommissionsAdmin, getCommissionsParRestaurantAdmin } from "@/lib/db/queries-admin";
import { ChevronLeft, ChevronRight, ShoppingBag, Store, Wallet } from "lucide-react";
import Link from "next/link";

const statutsValides = new Set(["en_attente", "payee", "annulee"]);

function parseStartDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseEndDate(value?: string) {
  const date = parseStartDate(value);
  if (!date) return undefined;
  date.setHours(23, 59, 59, 999);
  return date;
}

export default async function AdminCommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ restaurant?: string; statut?: string; dateDebut?: string; dateFin?: string; page?: string }>;
}) {
  await getAdminSession();
  const params = await searchParams;
  const statut = statutsValides.has(params.statut ?? "")
    ? (params.statut as "en_attente" | "payee" | "annulee")
    : "tous";
  const hasFilters = Boolean(params.restaurant || params.statut || params.dateDebut || params.dateFin);
  const page = parsePage(params.page);

  const [parRestaurant, commissionsResult] = await Promise.all([
    hasFilters ? Promise.resolve([]) : getCommissionsParRestaurantAdmin(),
    hasFilters
      ? getCommissionsAdmin({
          restaurantSearch: params.restaurant,
          statut,
          dateDebut: parseStartDate(params.dateDebut),
          dateFin: parseEndDate(params.dateFin),
          page,
          limit: 25,
        })
      : Promise.resolve(null),
  ]);
  const commissions = commissionsResult?.items ?? [];
  const totalDu = hasFilters
    ? commissionsResult?.summary.montantTotal ?? 0
    : parRestaurant.reduce((sum, restaurant) => sum + Number(restaurant.montantDu), 0);
  const totalCommandes = hasFilters
    ? commissionsResult?.summary.commandesTotal ?? 0
    : parRestaurant.reduce((sum, restaurant) => sum + Number(restaurant.nombreCommandes), 0);
  const maxMontant = Math.max(...parRestaurant.map((restaurant) => Number(restaurant.montantDu)), 1);

  const buildUrl = (nextPage: number) => {
    const query = new URLSearchParams();
    if (params.restaurant) query.set("restaurant", params.restaurant);
    if (params.statut) query.set("statut", params.statut);
    if (params.dateDebut) query.set("dateDebut", params.dateDebut);
    if (params.dateFin) query.set("dateFin", params.dateFin);
    query.set("page", String(nextPage));
    return `?${query.toString()}`;
  };

  return (
    <AdminPage>
      <PageHeader title="Finance" description="Suivi des commissions, soldes et règlements des restaurants partenaires." />
      <CommissionsAdminFilters initialRestaurant={params.restaurant} initialStatut={params.statut} initialDateDebut={params.dateDebut} initialDateFin={params.dateFin} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Wallet} value={totalDu} valueSuffix=" FCFA" title={hasFilters ? "Commissions filtrées" : "Total en attente"} variant="success" />
        <StatCard icon={Store} value={hasFilters ? commissionsResult?.summary.restaurantsTotal ?? 0 : parRestaurant.length} title="Restaurants concernés" variant="info" />
        <StatCard icon={ShoppingBag} value={totalCommandes} title="Commandes facturées" />
      </div>

      {hasFilters ? (
        <CommissionDetailsTable rows={commissions} total={commissionsResult?.total ?? 0} />
      ) : (
        <RestaurantSummaryTable rows={parRestaurant} maxMontant={maxMontant} totalDu={totalDu} />
      )}

      {commissionsResult && commissionsResult.totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">Page {page} sur {commissionsResult.totalPages} — {commissionsResult.total} résultats</p>
          <div className="flex gap-2">
            {page > 1 && <Button asChild variant="outline"><Link href={buildUrl(page - 1)}><ChevronLeft className="h-4 w-4" />Précédent</Link></Button>}
            {page < commissionsResult.totalPages && <Button asChild><Link href={buildUrl(page + 1)}>Suivant<ChevronRight className="h-4 w-4" /></Link></Button>}
          </div>
        </div>
      )}
    </AdminPage>
  );
}
