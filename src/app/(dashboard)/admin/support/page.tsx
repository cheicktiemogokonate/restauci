import { CommandesAdminFilters } from "@/components/admin/commandes-admin-filters";
import { CommandesAdminTable } from "@/components/admin/commandes-admin-table";
import { AdminPage } from "@/components/admin/ui/admin-page";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAdminSession } from "@/lib/auth/get-admin-session";
import { parsePage } from "@/lib/config/pagination";
import {
  getAdminSupportSummary,
  getCommandesGlobalAdmin,
  type AdminSupportSignal,
} from "@/lib/db/queries-admin";
import type { StatutCommande } from "@/lib/db/types";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  RefreshCcw,
  Search,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

const validSignals = new Set<AdminSupportSignal>([
  "stalled",
  "payment_failed",
  "refunded",
  "cancelled_today",
]);

const signalMeta: Record<
  AdminSupportSignal,
  { label: string; description: string }
> = {
  stalled: {
    label: "Commandes potentiellement bloquées",
    description: "Non terminées depuis plus de deux heures, sur les 7 derniers jours.",
  },
  payment_failed: {
    label: "Paiements échoués",
    description: "Échecs de paiement enregistrés sur les 30 derniers jours.",
  },
  refunded: {
    label: "Paiements remboursés",
    description: "Remboursements enregistrés sur les 30 derniers jours.",
  },
  cancelled_today: {
    label: "Commandes annulées aujourd’hui",
    description: "Annulations enregistrées depuis le début de la journée.",
  },
};

function SignalCard({
  signal,
  count,
  icon: Icon,
  active,
}: {
  signal: AdminSupportSignal;
  count: number;
  icon: LucideIcon;
  active: boolean;
}) {
  const meta = signalMeta[signal];
  return (
    <Link href={`?signal=${signal}`} className="group">
      <Card
        className={
          active
            ? "h-full gap-3 border-emerald-300 bg-emerald-50/50 p-5 shadow-none"
            : "h-full gap-3 p-5 shadow-none transition-colors group-hover:bg-muted/30"
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Icon className="size-5" />
          </div>
          <StatusBadge
            variant={count > 0 ? "warning" : "success"}
            pulse={count > 0}
          >
            {count.toLocaleString("fr-FR")}
          </StatusBadge>
        </div>
        <div>
          <h2 className="font-semibold">{meta.label}</h2>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {meta.description}
          </p>
        </div>
      </Card>
    </Link>
  );
}

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    statut?: string;
    restaurant?: string;
    dateDebut?: string;
    dateFin?: string;
    signal?: string;
    page?: string;
  }>;
}) {
  await getAdminSession();
  const params = await searchParams;
  const page = parsePage(params.page);
  const signal = validSignals.has(params.signal as AdminSupportSignal)
    ? (params.signal as AdminSupportSignal)
    : undefined;
  const validStatuts = new Set<StatutCommande>([
    "recue",
    "en_preparation",
    "prete",
    "servie",
    "annulee",
  ]);
  const statut = validStatuts.has(params.statut as StatutCommande)
    ? (params.statut as StatutCommande)
    : undefined;
  const toStartOfDay = (value?: string) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? undefined : date;
  };
  const toEndOfDay = (value?: string) => {
    const date = toStartOfDay(value);
    if (!date) return undefined;
    date.setHours(23, 59, 59, 999);
    return date;
  };

  const hasInvestigationCriteria = Boolean(
    signal ||
      params.search?.trim() ||
      params.restaurant?.trim() ||
      params.dateDebut ||
      params.dateFin,
  );
  const [summary, result] = await Promise.all([
    getAdminSupportSummary(),
    hasInvestigationCriteria
      ? getCommandesGlobalAdmin({
          statut,
          search: params.search,
          restaurantSearch: params.restaurant,
          dateDebut: toStartOfDay(params.dateDebut),
          dateFin: toEndOfDay(params.dateFin),
          signal,
          page,
          limit: 25,
        })
      : Promise.resolve({ items: [], total: 0, totalPages: 0 }),
  ]);

  const pageUrl = (nextPage: number) => {
    const query = new URLSearchParams();
    if (params.statut) query.set("statut", params.statut);
    if (params.search) query.set("search", params.search);
    if (params.restaurant) query.set("restaurant", params.restaurant);
    if (params.dateDebut) query.set("dateDebut", params.dateDebut);
    if (params.dateFin) query.set("dateFin", params.dateFin);
    if (signal) query.set("signal", signal);
    query.set("page", String(nextPage));
    return `?${query.toString()}`;
  };

  return (
    <AdminPage>
      <PageHeader
        title="Support et investigations"
        description="Repérez les anomalies opérationnelles et retrouvez une commande précise sans parcourir le flux global."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SignalCard
          signal="stalled"
          count={summary.stalledOrders}
          icon={Clock3}
          active={signal === "stalled"}
        />
        <SignalCard
          signal="payment_failed"
          count={summary.failedPayments}
          icon={XCircle}
          active={signal === "payment_failed"}
        />
        <SignalCard
          signal="refunded"
          count={summary.refundedPayments}
          icon={RefreshCcw}
          active={signal === "refunded"}
        />
        <SignalCard
          signal="cancelled_today"
          count={summary.cancelledToday}
          icon={AlertTriangle}
          active={signal === "cancelled_today"}
        />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Recherche ciblée</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Utilisez un numéro, un restaurant, un client ou une période.
          </p>
        </div>
        <CommandesAdminFilters
          initialSearch={params.search}
          initialStatut={params.statut}
          initialRestaurant={params.restaurant}
          initialDateDebut={params.dateDebut}
          initialDateFin={params.dateFin}
          initialSignal={signal}
        />
      </section>

      {hasInvestigationCriteria ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {result.total.toLocaleString("fr-FR")} résultat
              {result.total > 1 ? "s" : ""}
            </p>
            {signal && (
              <StatusBadge variant="info">
                {signalMeta[signal].label}
              </StatusBadge>
            )}
          </div>
          <CommandesAdminTable items={result.items} />
        </>
      ) : (
        <Card className="shadow-none">
          <EmptyState
            icon={<Search className="size-7" />}
            title="Sélectionnez un signal ou lancez une recherche"
            description="Aucune liste globale de commandes n’est chargée par défaut."
          />
        </Card>
      )}

      {result.totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} sur {result.totalPages} — {result.total} résultats
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline">
                <Link href={pageUrl(page - 1)}>
                  <ChevronLeft className="size-4" />
                  Précédent
                </Link>
              </Button>
            )}
            {page < result.totalPages && (
              <Button asChild>
                <Link href={pageUrl(page + 1)}>
                  Suivant
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </AdminPage>
  );
}
