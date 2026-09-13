"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Eye, History, Save, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { CatalogueHistory } from "@/components/admin/abonnements/catalogue-history";
import { CataloguePlanEditor } from "@/components/admin/abonnements/catalogue-plan-editor";
import { CataloguePolicyEditor } from "@/components/admin/abonnements/catalogue-policy-editor";
import { StatefulButton, type ButtonState } from "@/components/motion/stateful-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/motion/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  publishSubscriptionCatalogueDraftAction,
  restoreSubscriptionCatalogueRevisionToDraftAction,
  saveSubscriptionCatalogueDraftAction,
} from "@/app/_actions/admin-subscriptions";
import {
  subscriptionCataloguePayloadSchema,
  type SubscriptionCataloguePayload,
} from "@/modules/subscriptions/contracts";

type ActivityType = "restaurant" | "residence";

export interface CatalogueWorkspace {
  current: SubscriptionCataloguePayload;
  draft: SubscriptionCataloguePayload;
  draftMeta: { updatedByAdminId: string; updatedAt: string } | null;
  revisions: {
    id: string;
    version: number;
    publishedByAdminId: string;
    publishedAt: string;
  }[];
}

const serialize = (payload: SubscriptionCataloguePayload) => JSON.stringify(payload);

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getValidationMessage(payload: SubscriptionCataloguePayload) {
  const result = subscriptionCataloguePayloadSchema.safeParse(payload);
  if (result.success) return null;
  return result.error.issues[0]?.message ?? "La configuration est invalide.";
}

function ExposurePreview({
  payload,
  activityType,
}: {
  payload: SubscriptionCataloguePayload;
  activityType: ActivityType;
}) {
  const sortedPlans = [...payload.plans].sort(
    (first, second) =>
      first.presentation[activityType].exposureWeight -
      second.presentation[activityType].exposureWeight,
  );
  const maximum = Math.max(
    ...sortedPlans.map((plan) => plan.presentation[activityType].exposureWeight),
  );
  const policy = payload.policies[activityType];

  return (
    <Card className="overflow-hidden border-primary/15 shadow-none">
      <CardContent className="grid gap-6 p-0 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <Eye className="size-4 text-primary" />
                Aperçu de l’avantage d’exposition
              </div>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Le poids augmente la fréquence de rotation parmi les résultats déjà éligibles.
                Il ne garantit jamais une première position.
              </p>
            </div>
            <Badge variant={policy.enabled ? "default" : "secondary"}>
              {policy.enabled ? "Mise en avant active" : "Mise en avant arrêtée"}
            </Badge>
          </div>

          <div className="space-y-4">
            {sortedPlans.map((plan, index) => {
              const presentation = plan.presentation[activityType];
              const width = Math.max(12, (presentation.exposureWeight / maximum) * 100);
              return (
                <div key={plan.code} className="grid gap-2 sm:grid-cols-[150px_1fr_48px] sm:items-center">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[11px] tabular-nums">
                      {index + 1}
                    </span>
                    <span className="truncate">{plan.nom}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="text-right text-sm font-semibold tabular-nums">
                    ×{presentation.exposureWeight}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t bg-muted/35 p-5 sm:p-6 lg:border-l lg:border-t-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Projection indicative d’une page
          </p>
          <div className="mt-4 grid grid-cols-4 gap-2" aria-label="Projection de huit emplacements">
            {Array.from({ length: 8 }, (_, index) => {
              const promotedCount = policy.enabled
                ? Math.floor((8 * policy.sponsoredShareBps) / 10_000)
                : 0;
              const promoted = index < promotedCount;
              return (
                <div
                  key={index}
                  className={promoted
                    ? "flex aspect-square items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary"
                    : "flex aspect-square items-center justify-center rounded-lg border bg-background text-muted-foreground"}
                >
                  {promoted ? <CheckCircle2 className="size-4" /> : index + 1}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Jusqu’à <strong className="font-semibold text-foreground">{policy.sponsoredShareBps / 100} %</strong>{" "}
            des résultats peuvent porter le libellé « Mis en avant ».
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function CatalogueEditor({ workspace }: { workspace: CatalogueWorkspace }) {
  const router = useRouter();
  const [activityType, setActivityType] = useState<ActivityType>("restaurant");
  const [payload, setPayload] = useState(workspace.draft);
  const [baseline, setBaseline] = useState(() => serialize(workspace.draft));
  const [draftMeta, setDraftMeta] = useState(workspace.draftMeta);
  const [operation, setOperation] = useState<"save" | "publish" | `restore:${string}` | null>(null);
  const [saveState, setSaveState] = useState<ButtonState>("idle");

  const dirty = useMemo(() => serialize(payload) !== baseline, [baseline, payload]);
  const validationMessage = useMemo(() => getValidationMessage(payload), [payload]);

  const updatePlan = (updatedPlan: SubscriptionCataloguePayload["plans"][number]) => {
    setPayload((current) => ({
      ...current,
      plans: current.plans.map((plan) =>
        plan.code === updatedPlan.code ? updatedPlan : plan,
      ),
    }));
  };

  const updatePolicy = (
    activity: ActivityType,
    policy: SubscriptionCataloguePayload["policies"][ActivityType],
  ) => {
    setPayload((current) => ({
      ...current,
      policies: { ...current.policies, [activity]: policy },
    }));
  };

  const saveDraft = async () => {
    const parsed = subscriptionCataloguePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Configuration invalide");
      return;
    }
    setOperation("save");
    setSaveState("loading");
    try {
      const result = await saveSubscriptionCatalogueDraftAction(parsed.data);
      setPayload(parsed.data);
      setBaseline(serialize(parsed.data));
      setDraftMeta({ updatedAt: result.updatedAt, updatedByAdminId: "" });
      setSaveState("success");
      toast.success("Brouillon enregistré");
      window.setTimeout(() => setSaveState("idle"), 1_200);
    } catch (error) {
      setSaveState("error");
      toast.error(error instanceof Error ? error.message : "Impossible d’enregistrer le brouillon");
    } finally {
      setOperation(null);
    }
  };

  const publish = async () => {
    const parsed = subscriptionCataloguePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Configuration invalide");
      return;
    }
    setOperation("publish");
    try {
      await saveSubscriptionCatalogueDraftAction(parsed.data);
      const revision = await publishSubscriptionCatalogueDraftAction();
      setPayload(parsed.data);
      setBaseline(serialize(parsed.data));
      setDraftMeta(null);
      toast.success(`Version ${revision.version} publiée`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Publication impossible");
    } finally {
      setOperation(null);
    }
  };

  const restoreRevision = async (revisionId: string, version: number) => {
    setOperation(`restore:${revisionId}`);
    try {
      await restoreSubscriptionCatalogueRevisionToDraftAction(revisionId);
      toast.success(`Version ${version} restaurée dans le brouillon`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Restauration impossible");
    } finally {
      setOperation(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-3 z-20 rounded-xl border bg-background/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={draftMeta || dirty ? "secondary" : "outline"}>
              {dirty ? "Modifications non enregistrées" : draftMeta ? "Brouillon enregistré" : "Configuration publiée"}
            </Badge>
            {draftMeta ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" />
                {formatDate(draftMeta.updatedAt)}
              </span>
            ) : null}
            {validationMessage ? (
              <span className="text-xs font-medium text-destructive">{validationMessage}</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5 text-emerald-600" />
                Règles inter-offres valides
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatefulButton
              state={saveState}
              variant="outline"
              icon={<Save />}
              loadingText="Enregistrement…"
              successText="Brouillon enregistré"
              disabled={!dirty || operation !== null || Boolean(validationMessage)}
              onClick={saveDraft}
            >
              Enregistrer le brouillon
            </StatefulButton>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={
                    operation !== null ||
                    Boolean(validationMessage) ||
                    (!dirty && !draftMeta)
                  }
                >
                  <Send data-icon="inline-start" />
                  Publier
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogMedia><Send /></AlertDialogMedia>
                  <AlertDialogTitle>Publier cette configuration ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Les prix, commissions, quotas et avantages d’exposition deviendront immédiatement
                    visibles. Les montants et quotas déjà figés dans une période restent inchangés.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={publish}>Publier maintenant</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <Tabs value={activityType} onValueChange={(value) => setActivityType(value as ActivityType)} variant="underline">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="restaurant">Restaurant</TabsTrigger>
          <TabsTrigger value="residence">Résidence</TabsTrigger>
        </TabsList>

        {(["restaurant", "residence"] as const).map((activity) => (
          <TabsContent key={activity} value={activity} className="space-y-6 pt-6">
            <ExposurePreview payload={payload} activityType={activity} />
            <CataloguePolicyEditor
              activityType={activity}
              policy={payload.policies[activity]}
              onChange={(policy) => updatePolicy(activity, policy)}
            />

            <div>
              <div className="mb-4">
                <h2 className="text-base font-semibold">Offres et avantages</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Les paramètres commerciaux sont communs aux deux activités. Les quotas, libellés
                  et avantages d’exposition restent propres à l’activité affichée.
                </p>
              </div>
              <div className="grid items-start gap-4 2xl:grid-cols-3">
                {[...payload.plans]
                  .sort((first, second) => first.ordre - second.ordre)
                  .map((plan) => (
                    <CataloguePlanEditor
                      key={plan.code}
                      activityType={activity}
                      plan={plan}
                      onChange={updatePlan}
                    />
                  ))}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="size-4 text-primary" />
          <div>
            <h2 className="text-base font-semibold">Historique de publication</h2>
            <p className="text-sm text-muted-foreground">
              Restaurer une version la replace en brouillon : la production ne change qu’après publication.
            </p>
          </div>
        </div>
        <CatalogueHistory
          revisions={workspace.revisions}
          restoringId={operation?.startsWith("restore:") ? operation.slice(8) : null}
          disabled={operation !== null}
          onRestore={restoreRevision}
        />
      </section>
    </div>
  );
}
