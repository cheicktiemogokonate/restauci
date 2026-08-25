import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { RestaurateurSubscriptionButton } from "@/components/restaurateur/restaurateur-subscription-button";
import { ResumeSubscriptionPayment } from "@/components/restaurateur/resume-subscription-payment";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePartnerActivity } from "@/lib/auth/partner-account";
import { formatPrix } from "@/lib/utils/format";
import {
  getPublishedSubscriptionCatalogue,
  getResidenceSubscriptionBilling,
} from "@/modules/subscriptions/server";

export const metadata = {
  title: "Facturation et abonnement Résidence | Toutci",
};

export const dynamic = "force-dynamic";

export default async function ResidencePartnerBillingPage() {
  const partnerAccount = await requirePartnerActivity("residence");
  const [billing, catalogue] = await Promise.all([
    getResidenceSubscriptionBilling(partnerAccount.id),
    getPublishedSubscriptionCatalogue(),
  ]);
  const { effectivePlan, pendingRequest, plans } = billing;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Facturation & Abonnement
        </h1>
        <p className="text-muted-foreground">
          Gérez le forfait de votre compte partenaire Résidence.
        </p>
      </div>

      {pendingRequest ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div>
            <h2 className="font-semibold text-amber-900">
              Demande en cours de traitement
            </h2>
            <p className="mt-1 text-sm">
              L’offre demandée sera activée après confirmation réelle du
              règlement.
            </p>
            {pendingRequest.prixFigeFcfa > 0 ? (
              <ResumeSubscriptionPayment requestId={pendingRequest.id} />
            ) : null}
          </div>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Mon offre actuelle</CardTitle>
          <CardDescription>
            Le quota porte sur les résidences publiées simultanément.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <span className="text-3xl font-bold capitalize text-primary">
            {effectivePlan.plan.nom}
          </span>
          {effectivePlan.period?.statut === "active" ? (
            <Badge className="bg-emerald-500">
              <CheckCircle2 className="mr-1 size-3" /> Actif
            </Badge>
          ) : null}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Changer d’offre</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const cataloguePlan = catalogue.plans.find(
              (candidate) => candidate.code === plan.code,
            );
            if (!cataloguePlan) {
              throw new Error(`Présentation Résidence absente pour l'offre ${plan.code}`);
            }
            const presentation = cataloguePlan.presentation.residence;
            const residenceLimit = plan.limits.find(
              (limit) => limit.resourceType === "residence",
            );
            if (!residenceLimit) {
              throw new Error(`Quota Résidence incomplet pour l'offre ${plan.code}`);
            }
            const isCurrent = effectivePlan.plan.code === plan.code;
            const isPending = pendingRequest?.planCode === plan.code;
            const isUnavailableTransition =
              plan.code === "decouverte" ||
              (effectivePlan.period !== null &&
                plan.ordre <= effectivePlan.plan.ordre);

            return (
              <Card
                key={plan.id}
                className={presentation.recommended ? "relative flex flex-col border-primary ring-1 ring-primary/15" : "flex flex-col"}
              >
                {presentation.recommended ? (
                  <Badge className="absolute right-3 top-3">Offre recommandée</Badge>
                ) : null}
                <CardHeader>
                  <CardTitle className="capitalize">{plan.nom}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <p className="text-3xl font-bold">
                    {formatPrix(plan.prixAnnuelFcfa)}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}/ an
                    </span>
                  </p>
                  <p className="text-sm">
                    {residenceLimit.maxCount === null
                      ? "Résidences publiées illimitées"
                      : `${residenceLimit.maxCount} résidence${residenceLimit.maxCount > 1 ? "s" : ""} publiée${residenceLimit.maxCount > 1 ? "s" : ""} simultanément`}
                  </p>
                  <ul className="space-y-2 border-t pt-4 text-sm">
                    {presentation.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
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
                    hasAnyPending={Boolean(pendingRequest)}
                    disabled={isUnavailableTransition}
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
      </section>
    </main>
  );
}
