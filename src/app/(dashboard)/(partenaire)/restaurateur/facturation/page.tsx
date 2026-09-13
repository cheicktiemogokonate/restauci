import { RestaurateurSubscriptionButton } from "@/components/restaurateur/restaurateur-subscription-button";
import { PayCommissionDebt } from "@/modules/commissions/presentation/pay-commission-debt";
import { payCommissionDebtAction } from "@/app/_actions/partner-payments";
import { ResumeSubscriptionPayment } from "@/components/restaurateur/resume-subscription-payment";
import { RestaurantValidationStatus } from "@/modules/restaurants/presentation/restaurant-validation-status";
import { resoumettreRestaurantAction } from "../actions";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getRestaurateurSession } from "@/app/_shared/restaurant-session";
import {
  getAvailableCashCommissionDebt,
  getCashCommissionStatus,
  getPartnerCommissionWorkspace,
} from "@/modules/commissions/server";
import {
  getPublishedSubscriptionCatalogue,
  getRestaurantSubscriptionBilling,
} from "@/modules/subscriptions/server";
import { formatPrix } from "@/shared/format";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, CheckCircle2, Clock3, ReceiptText, Wallet } from "lucide-react";

export const metadata = {
  title: "Facturation et Abonnement | Adon",
};

export default async function FacturationPage() {
  const { partnerAccount, restaurant: restaurantData } =
    await getRestaurateurSession();

  const [billing, catalogue, cashStatus, availableDebt, commissionWorkspace] =
    await Promise.all([
      getRestaurantSubscriptionBilling(partnerAccount.id),
      getPublishedSubscriptionCatalogue(),
    getCashCommissionStatus(partnerAccount.id),
    getAvailableCashCommissionDebt(partnerAccount.id),
      getPartnerCommissionWorkspace({ partnerAccountId: partnerAccount.id }),
    ]);
  const { effectivePlan, pendingRequest, plans } = billing;
  const { commissionLines, settlements } = commissionWorkspace;

  return (
    <div className="space-y-6 container mx-auto p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Facturation & Abonnement
        </h1>
        <p className="text-muted-foreground">
          Gérez votre formule d'abonnement et visualisez l'historique de vos
          factures.
        </p>
      </div>

      {pendingRequest && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900">
              Demande en cours de traitement
            </h3>
            <p className="text-sm mt-1">
              Vous avez demandé à souscrire à l'offre{" "}
              <span className="font-medium capitalize">
                {plans.find((plan) => plan.code === pendingRequest.planCode)?.nom ?? pendingRequest.planCode}
              </span>
              . Votre demande est en attente de validation. Une fois le
              règlement reçu, votre nouvelle période s'activera.
            </p>
            {pendingRequest.prixFigeFcfa > 0 ? <ResumeSubscriptionPayment requestId={pendingRequest.id} /> : null}
          </div>
        </div>
      )}

      <RestaurantValidationStatus
        actif={restaurantData.actif}
        suspendu={restaurantData.suspendu}
        motifRejet={restaurantData.motifRejet}
        motifSuspension={restaurantData.motifSuspension}
        action={resoumettreRestaurantAction}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Card className={cashStatus.cashAllowed ? "" : "border-red-300 bg-red-50/40"}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Wallet className="size-4" /> Dette cash actuelle</CardDescription>
            <CardTitle>{formatPrix(cashStatus.outstandingDebt)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {cashStatus.cashAllowed ? "Les commandes payées sur place restent disponibles." : "Le délai de grâce est expiré : les nouvelles commandes cash sont désactivées jusqu’au solde complet."}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Clock3 className="size-4" /> Cycle de régularisation</CardDescription>
            <CardTitle className="text-xl">{cashStatus.cycle ? "En cours" : "Aucun cycle"}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {cashStatus.graceEndsAt
              ? `Échéance : ${format(cashStatus.graceEndsAt, "dd MMMM yyyy", { locale: fr })}`
              : `Déclenchement à ${formatPrix(cashStatus.threshold)}.`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><ReceiptText className="size-4" /> Mode de collecte actuel</CardDescription>
            <CardTitle className="text-xl">Créance cash</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Le paiement sur place génère une dette de commission après service. Aucun paiement fournisseur n’est simulé.</CardContent>
        </Card>
      </section>

      <PayCommissionDebt
        availableDebtFcfa={availableDebt}
        onPay={payCommissionDebtAction}
      />

      <Card>
        <CardHeader>
          <CardTitle>Historique des commissions</CardTitle>
          <CardDescription>Snapshot contractuel par commande et solde restant après allocations confirmées.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-3">Commande</th><th>Statut</th><th>Collecte</th><th className="text-right">Commission</th><th className="text-right">Solde</th><th className="text-right">Date</th></tr></thead>
            <tbody>{commissionLines.map((line) => {
              const remaining = line.commercialStatus === "due" ? Math.max(0, line.amountFcfa - Number(line.allocatedFcfa)) : 0;
              return <tr key={line.id} className="border-b last:border-0"><td className="py-3 font-mono text-xs">{line.commandeId?.slice(0, 8) ?? "Réservation"}</td><td>{line.commercialStatus === "pending" ? "En attente de service" : line.commercialStatus === "due" ? "Due" : "Annulée"}</td><td>{line.collectionMode === "cash_receivable" ? "Cash" : "Répartition fournisseur"}</td><td className="text-right">{formatPrix(line.amountFcfa)}</td><td className="text-right font-medium">{formatPrix(remaining)}</td><td className="text-right text-muted-foreground">{format(line.createdAt, "dd/MM/yyyy")}</td></tr>;
            })}</tbody>
          </table>
          {commissionLines.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Aucune commission enregistrée.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Règlements confirmés</CardTitle><CardDescription>Seuls les encaissements réellement confirmés réduisent votre dette.</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {settlements.map((settlement) => <div key={settlement.id} className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{settlement.referenceExterne}</p><p className="text-xs text-muted-foreground">{settlement.source === "manual_admin" ? "Confirmé par l’administration" : settlement.source === "paystack_direct" ? "Paystack" : "Récupération fournisseur"} · {settlement.paidAt ? format(settlement.paidAt, "dd/MM/yyyy") : "En attente"}</p></div><span className="font-semibold text-emerald-700">{formatPrix(settlement.montantFcfa)}</span></div>)}
          {settlements.length === 0 && <p className="text-sm text-muted-foreground">Aucun règlement confirmé.</p>}
        </CardContent>
      </Card>

      {/* Offre actuelle */}
      <Card>
        <CardHeader>
          <CardTitle>Mon offre actuelle</CardTitle>
          <CardDescription>
            Les détails de votre abonnement en cours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold capitalize text-primary">
              {effectivePlan.plan?.nom || "Non défini"}
            </div>
            {effectivePlan.period?.statut === "active" && (
              <Badge
                variant="default"
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" /> Actif
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">
                Taux de commission appliqué
              </span>
              <p className="text-lg font-medium">
                {(
                  (effectivePlan.period?.tauxCommissionBpsFige ??
                    effectivePlan.plan?.tauxCommissionBps ??
                    0) / 100
                ).toFixed(1)}
                %
              </p>
            </div>
            {effectivePlan.period?.dateEcheance ? (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">
                  Prochaine échéance
                </span>
                <p className="text-lg font-medium">
                  {format(effectivePlan.period.dateEcheance, "dd MMMM yyyy", {
                    locale: fr,
                  })}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">
                  Prochaine échéance
                </span>
                <p className="text-lg font-medium">Sans engagement</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Catalogue */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Changer d'offre</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const cataloguePlan = catalogue.plans.find(
              (candidate) => candidate.code === plan.code,
            );
            if (!cataloguePlan) {
              throw new Error(`Présentation Restaurant absente pour l'offre ${plan.code}`);
            }
            const presentation = cataloguePlan.presentation.restaurant;
            const limitByResource = new Map(
              plan.limits.map((limit) => [limit.resourceType, limit.maxCount]),
            );
            const maxDishes = limitByResource.get("dish");
            const categoryLimit = limitByResource.get("category");
            if (maxDishes === undefined || categoryLimit === undefined) {
              throw new Error(`Quotas incomplets pour l'offre ${plan.code}`);
            }
            const isCurrent = effectivePlan.plan?.code === plan.code;
            const isPending = pendingRequest?.planCode === plan.code;
            const isUnavailableTransition =
              plan.code === "decouverte" ||
              (effectivePlan.period !== null &&
                plan.ordre <= effectivePlan.plan.ordre);

            return (
              <Card
                key={plan.id}
                className={`flex flex-col relative ${isCurrent ? "border-primary ring-1 ring-primary/20" : ""}`}
              >
                {isCurrent && (
                  <div className="absolute top-3 right-3 transform translate-x-2 -translate-y-2">
                    <Badge className="bg-primary text-primary-foreground shadow-sm">
                      Offre Actuelle
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  {presentation.recommended && !isCurrent ? (
                    <Badge className="mb-2 w-fit">Offre recommandée</Badge>
                  ) : null}
                  <CardTitle className="capitalize text-xl">
                    {plan.nom}
                  </CardTitle>
                  <CardDescription className="min-h-10">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="text-3xl font-bold">
                    {formatPrix(plan.prixAnnuelFcfa)}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      / an
                    </span>
                  </div>

                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>
                        Commission de{" "}
                        {(plan.tauxCommissionBps / 100).toFixed(1)}%
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>
                        {maxDishes === null
                          ? "Plats illimités"
                          : `Jusqu'à ${maxDishes} plats publiables`}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>
                        {categoryLimit === null
                          ? "Catégories illimitées"
                          : `Jusqu'à ${categoryLimit} catégories publiables`}
                      </span>
                    </li>
                    {presentation.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <RestaurateurSubscriptionButton
                    planCode={plan.code}
                    planName={plan.nom}
                    isCurrent={isCurrent}
                    isPending={isPending}
                    hasAnyPending={!!pendingRequest}
                    disabled={
                      !restaurantData.actif ||
                      restaurantData.suspendu ||
                      isUnavailableTransition
                    }
                    unavailableLabel={
                      plan.code === "decouverte"
                        ? "Plan gratuit automatique"
                        : isUnavailableTransition
                          ? "Changement non disponible"
                          : undefined
                    }
                  />
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
