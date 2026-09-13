import { AbonnesTable } from "@/components/admin/abonnements/abonnes-table";
import { SubscriptionHistoryTable } from "@/components/admin/abonnements/subscription-history-table";
import { AdminSubscriptionRequestsTable } from "@/components/admin/admin-subscription-requests-table";
import { AdminPage } from "@/components/admin/ui/admin-page";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatCard } from "@/components/admin/ui/stat-card";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/motion/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAdminSession } from "@/modules/auth/server";
import { getAdminSubscriptionOperationsWorkspace } from "@/modules/subscriptions/server";
import { getAdminFinancialJournal } from "@/modules/transactions/server";
import { FinancialJournalTable } from "@/modules/transactions/presentation/financial-journal-table";
import {
  CalendarClock,
  ClipboardCheck,
  ReceiptText,
  RefreshCcw,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Abonnements — Administration",
};

export default async function AdminAbonnementsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  await getAdminSession();
  const params = await searchParams;
  if (params.section === "catalogue") redirect("/admin/parametres");
  const validSections = new Set([
    "demandes",
    "abonnes",
    "historique",
    "finances",
  ]);
  const activeSection = validSections.has(params.section ?? "")
    ? (params.section ?? "demandes")
    : "demandes";

  const now = new Date();
  const [operations, financialJournal] = await Promise.all([
    getAdminSubscriptionOperationsWorkspace(now),
    getAdminFinancialJournal(),
  ]);
  const {
    pendingRequests,
    summary,
    activeSubscribers,
    recentPeriods,
  } = operations;
  const inDays = (days: number) => {
    const deadline = new Date(now);
    deadline.setDate(deadline.getDate() + days);
    return activeSubscribers.filter(
      (period) =>
        period.planCode !== "decouverte" &&
        period.dateEcheance !== null &&
        period.dateEcheance >= now &&
        period.dateEcheance <= deadline,
    ).length;
  };
  const paidActiveCount = activeSubscribers.filter(
    (period) =>
      period.statut === "active" && period.planCode !== "decouverte",
  ).length;

  return (
    <AdminPage>
      <PageHeader
        title="Abonnements"
        description="Gérez les demandes, les abonnements actifs et leur historique."
      />

      <Tabs
        defaultValue={activeSection}
        variant="underline"
        className="max-w-full"
      >
        <div className="-mx-4 overflow-x-auto px-4 scrollbar-hide sm:mx-0 sm:px-0">
          <TabsList className="h-11 min-w-max gap-0">
            <TabsTrigger
              value="demandes"
              className="h-11 gap-1.5 px-3.5 text-sm"
              indicatorClassName="h-0.5 bg-emerald-600"
            >
              Demandes
              {pendingRequests.length > 0 && (
                <StatusBadge variant="danger" pulse className="ml-1">
                  {pendingRequests.length}
                </StatusBadge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="abonnes"
              className="h-11 px-3.5 text-sm"
              indicatorClassName="h-0.5 bg-emerald-600"
            >
              Partenaires abonnés
            </TabsTrigger>
            <TabsTrigger
              value="historique"
              className="h-11 px-3.5 text-sm"
              indicatorClassName="h-0.5 bg-emerald-600"
            >
              Historique
            </TabsTrigger>
            <TabsTrigger
              value="finances"
              className="h-11 gap-1.5 px-3.5 text-sm"
              indicatorClassName="h-0.5 bg-emerald-600"
            >
              <ReceiptText className="size-4" />
              Finances
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="demandes" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              title="Demandes à valider"
              value={pendingRequests.length}
              icon={ClipboardCheck}
              variant="warning"
            />
            <StatCard
              title="Demandes reçues ce mois"
              value={Number(summary?.requestsThisMonth ?? 0)}
              icon={CalendarClock}
              variant="info"
            />
          </div>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Demandes en attente</CardTitle>
              <CardDescription>
                Partenaires Restaurant ou Résidence ayant demandé à souscrire
                ou renouveler une offre payante.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  Aucune demande en attente.
                </div>
              ) : (
                <AdminSubscriptionRequestsTable requests={pendingRequests} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="abonnes" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              title="Payants actifs"
              value={paidActiveCount}
              icon={Users}
              variant="success"
            />
            <StatCard
              title="Échéance sous 30 j"
              value={inDays(30)}
              icon={CalendarClock}
              variant="warning"
            />
            <StatCard
              title="Échéance sous 7 j"
              value={inDays(7)}
              icon={CalendarClock}
              variant="warning"
            />
            <StatCard
              title="Échéance sous 1 j"
              value={inDays(1)}
              icon={CalendarClock}
              variant="danger"
            />
            <StatCard
              title="Expirés vers Découverte (7 j)"
              value={Number(summary?.recentDiscoveryReturns ?? 0)}
              icon={RefreshCcw}
              variant="info"
            />
          </div>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Abonnements actifs et suspendus</CardTitle>
              <CardDescription>
                Suivez les offres en cours et suspendez un abonnement si
                nécessaire.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AbonnesTable subscribers={activeSubscribers} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historique" className="space-y-4">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Périodes récentes</CardTitle>
              <CardDescription>
                Historique des abonnements activés récemment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SubscriptionHistoryTable periods={recentPeriods} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finances" className="space-y-4">
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Journal financier</CardTitle>
              <CardDescription>
                Montants, canaux, références, comptes sources et droits créés
                par les flux unifiés depuis la Phase 6.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FinancialJournalTable entries={financialJournal} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminPage>
  );
}
