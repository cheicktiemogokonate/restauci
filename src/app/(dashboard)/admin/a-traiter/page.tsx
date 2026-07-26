import { AdminPage } from "@/components/admin/ui/admin-page";
import { EmptyState } from "@/components/admin/ui/empty-state";
import { PageHeader } from "@/components/admin/ui/page-header";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { Card } from "@/components/ui/card";
import { getAdminSession } from "@/lib/auth/get-admin-session";
import { getAdminActionCenterSummary } from "@/lib/db/queries-admin";
import { formatPrix } from "@/lib/utils/format";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Search,
  Store,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

interface ActionItemProps {
  title: string;
  description: string;
  count: number;
  href: string;
  icon: LucideIcon;
  urgent?: boolean;
  countLabel?: string;
}

function ActionItem({
  title,
  description,
  count,
  href,
  icon: Icon,
  urgent,
  countLabel,
}: ActionItemProps) {
  return (
    <Link href={href} className="group block">
      <Card className="gap-0 p-0 shadow-none transition-colors group-hover:bg-muted/30">
        <div className="flex w-full items-center gap-4 p-5">
          <div
            className={
              urgent
                ? "flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"
                : "flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"
            }
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-foreground">{title}</h2>
              <StatusBadge variant={urgent ? "warning" : "info"}>
                {countLabel ?? count.toLocaleString("fr-FR")}
              </StatusBadge>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
        </div>
      </Card>
    </Link>
  );
}

export default async function AdminActionCenterPage() {
  await getAdminSession();
  const summary = await getAdminActionCenterSummary();
  const hasRequiredActions = summary.requiredActions > 0;

  return (
    <AdminPage>
      <PageHeader
        title="À traiter"
        description="Les validations, échéances et suivis qui nécessitent une intervention de l’administration."
        action={
          <StatusBadge
            variant={hasRequiredActions ? "warning" : "success"}
            pulse={hasRequiredActions}
          >
            {summary.requiredActions} action
            {summary.requiredActions === 1 ? "" : "s"} requise
            {summary.requiredActions === 1 ? "" : "s"}
          </StatusBadge>
        }
      />

      {hasRequiredActions ? (
        <section className="space-y-3" aria-label="Actions requises">
          {summary.pendingRestaurants > 0 && (
            <ActionItem
              title="Restaurants à examiner"
              description="Vérifier les nouveaux partenaires avant leur activation sur la plateforme."
              count={summary.pendingRestaurants}
              href="/admin/restaurants?statut=en_attente"
              icon={Store}
              urgent
            />
          )}
          {summary.pendingSubscriptions > 0 && (
            <ActionItem
              title="Demandes d’abonnement"
              description="Contrôler les règlements et valider ou refuser les demandes reçues."
              count={summary.pendingSubscriptions}
              href="/admin/abonnements?section=demandes"
              icon={CreditCard}
              urgent
            />
          )}
          {summary.expiringSubscriptions > 0 && (
            <ActionItem
              title="Abonnements arrivant à échéance"
              description="Anticiper les renouvellements prévus dans les trente prochains jours."
              count={summary.expiringSubscriptions}
              href="/admin/abonnements?section=abonnes"
              icon={CalendarClock}
              urgent
            />
          )}
        </section>
      ) : (
        <Card className="shadow-none">
          <EmptyState
            icon={<CheckCircle2 className="size-7" />}
            title="Aucune action urgente"
            description="Toutes les validations et échéances connues sont actuellement à jour."
          />
        </Card>
      )}
      <div className="flex gap-4 justify-around flex-wrap mt-6">
        <section className="space-y-3 max-w-md">
          <div>
            <h2 className="text-base font-semibold">Suivis financiers</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ces éléments sont à surveiller, sans être comptés comme des
              validations urgentes.
            </p>
          </div>
          <ActionItem
            title="Commissions en attente"
            description={`${summary.commissionRestaurants.toLocaleString("fr-FR")} restaurant${summary.commissionRestaurants > 1 ? "s" : ""} avec un solde à rapprocher ou encaisser.`}
            count={summary.commissionRestaurants}
            countLabel={formatPrix(summary.commissionsAmount)}
            href="/admin/commissions"
            icon={Wallet}
          />
        </section>

        <section className="space-y-3 max-w-md">
          <div>
            <h2 className="text-base font-semibold">Outils d’investigation</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Accès ponctuels destinés au support et à la vérification.
            </p>
          </div>
          <ActionItem
            title="Rechercher une commande"
            description="Retrouver une commande par numéro, client, restaurant ou période sans charger le flux global."
            count={0}
            countLabel="Ouvrir"
            href="/admin/support"
            icon={Search}
          />
        </section>
      </div>
    </AdminPage>
  );
}
