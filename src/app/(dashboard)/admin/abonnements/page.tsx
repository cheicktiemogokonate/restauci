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
import { getAdminSession } from "@/lib/auth/get-admin-session";
import { db } from "@/lib/db";
import { withDatabaseReadRetry } from "@/lib/db/read-retry";
import {
  restaurants,
  subscriptionPeriods,
  subscriptionRequests,
} from "@/lib/db/schema";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { CalendarClock, ClipboardCheck, RefreshCcw, Users } from "lucide-react";
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
  ]);
  const activeSection = validSections.has(params.section ?? "")
    ? (params.section ?? "demandes")
    : "demandes";

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Neon exécute ce batch en un seul aller-retour HTTP. La page faisait
  // auparavant six lectures séquentielles, ce qui expliquait ses 3 secondes
  // de chargement et augmentait le risque de panne intermédiaire.
  const [
    pendingRequests,
    summaryRows,
    activeSubscribers,
    recentPeriods,
  ] = await withDatabaseReadRetry(() =>
    db.batch([
      db
        .select({
          id: subscriptionRequests.id,
          restaurantId: subscriptionRequests.restaurantId,
          restaurantNom: restaurants.nom,
          planCode: subscriptionRequests.planCode,
          prixFigeFcfa: subscriptionRequests.prixFigeFcfa,
          statut: subscriptionRequests.statut,
          createdAt: subscriptionRequests.createdAt,
        })
        .from(subscriptionRequests)
        .innerJoin(
          restaurants,
          eq(subscriptionRequests.restaurantId, restaurants.id),
        )
        .where(eq(subscriptionRequests.statut, "en_attente"))
        .orderBy(desc(subscriptionRequests.createdAt)),
      db
        .select({
          requestsThisMonth: sql<number>`(
              SELECT COUNT(*) FROM ${subscriptionRequests}
              WHERE ${subscriptionRequests.createdAt} >= ${startOfMonth}
            )`,
          recentDiscoveryReturns: sql<number>`(
              SELECT COUNT(*) FROM ${subscriptionPeriods}
              WHERE ${subscriptionPeriods.statut} = ${"expiree"}
                AND ${subscriptionPeriods.planCode} = ${"decouverte"}
                AND ${subscriptionPeriods.createdAt} >= ${sevenDaysAgo}
            )`,
        })
        .from(sql`(SELECT 1) AS subscription_summary_source`),
      db
        .select({
          restaurantId: subscriptionPeriods.restaurantId,
          restaurantNom: restaurants.nom,
          planCode: subscriptionPeriods.planCode,
          statut: subscriptionPeriods.statut,
          dateDebut: subscriptionPeriods.dateDebut,
          dateEcheance: subscriptionPeriods.dateEcheance,
          tauxCommissionBpsFige: subscriptionPeriods.tauxCommissionBpsFige,
        })
        .from(subscriptionPeriods)
        .innerJoin(
          restaurants,
          eq(subscriptionPeriods.restaurantId, restaurants.id),
        )
        .where(inArray(subscriptionPeriods.statut, ["active", "suspendue"]))
        .orderBy(desc(subscriptionPeriods.dateEcheance)),
      db
        .select({
          id: subscriptionPeriods.id,
          restaurantNom: restaurants.nom,
          planCode: subscriptionPeriods.planCode,
          statut: subscriptionPeriods.statut,
          dateDebut: subscriptionPeriods.dateDebut,
          dateEcheance: subscriptionPeriods.dateEcheance,
          prixPayeFcfa: subscriptionPeriods.prixPayeFcfa,
        })
        .from(subscriptionPeriods)
        .innerJoin(
          restaurants,
          eq(subscriptionPeriods.restaurantId, restaurants.id),
        )
        .orderBy(desc(subscriptionPeriods.dateDebut))
        .limit(20),
    ]),
  );

  const summary = summaryRows[0];

  const now = new Date();
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
              Restaurants abonnés
            </TabsTrigger>
            <TabsTrigger
              value="historique"
              className="h-11 px-3.5 text-sm"
              indicatorClassName="h-0.5 bg-emerald-600"
            >
              Historique
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
                Restaurants ayant demandé à souscrire ou renouveler une offre
                payante.
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
              title="Retours Découverte (7 j)"
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
      </Tabs>
    </AdminPage>
  );
}
