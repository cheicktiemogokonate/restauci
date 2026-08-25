"use client";

import { Clock3, Gauge, UsersRound } from "lucide-react";

import { RangeSlider } from "@/components/motion/range-slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { SubscriptionCataloguePayload } from "@/modules/subscriptions/contracts";

type ActivityType = "restaurant" | "residence";
type Policy = SubscriptionCataloguePayload["policies"][ActivityType];

export function CataloguePolicyEditor({ activityType, policy, onChange }: {
  activityType: ActivityType;
  policy: Policy;
  onChange: (policy: Policy) => void;
}) {
  const activityLabel = activityType === "restaurant" ? "Restaurant" : "Résidence";

  return (
    <Card className="shadow-none">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Politique de découverte {activityLabel}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Ces garde-fous s’appliquent à toutes les pages de résultats de cette activité.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Mise en avant</p>
              <p className="text-xs text-muted-foreground">Activation globale</p>
            </div>
            <Switch
              checked={policy.enabled}
              aria-label={`Activer la mise en avant ${activityLabel}`}
              onCheckedChange={(enabled) => onChange({ ...policy, enabled })}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 pt-5 lg:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(180px,.6fr))]">
        <Field>
          <div className="flex items-center justify-between gap-4">
            <FieldLabel htmlFor={`${activityType}-sponsored-share`}>
              <Gauge className="size-4" /> Part maximale mise en avant
            </FieldLabel>
            <div className="flex items-center gap-1">
              <Input
                id={`${activityType}-sponsored-share`}
                type="number"
                min={0}
                max={50}
                step={1}
                className="w-20 text-right tabular-nums"
                value={policy.sponsoredShareBps / 100}
                onChange={(event) => onChange({ ...policy, sponsoredShareBps: Math.round(Number(event.target.value) * 100) })}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
          <RangeSlider
            value={policy.sponsoredShareBps / 100}
            min={0}
            max={50}
            step={5}
            aria-label="Part maximale de résultats mis en avant"
            formatValueText={(value) => `${value} %`}
            onValueChange={(value) => onChange({ ...policy, sponsoredShareBps: value * 100 })}
          />
          <FieldDescription>Le reste de la page demeure organique. La limite absolue autorisée est 50 %.</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor={`${activityType}-rotation`}>
            <Clock3 className="size-4" /> Fenêtre de rotation
          </FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              id={`${activityType}-rotation`}
              type="number"
              min={0.25}
              max={168}
              step={0.25}
              value={policy.rotationWindowMinutes / 60}
              onChange={(event) => onChange({ ...policy, rotationWindowMinutes: Math.round(Number(event.target.value) * 60) })}
            />
            <span className="text-sm text-muted-foreground">heures</span>
          </div>
          <FieldDescription>Stabilise l’ordre pendant cette durée.</FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor={`${activityType}-partner-limit`}>
            <UsersRound className="size-4" /> Maximum par partenaire
          </FieldLabel>
          <Input
            id={`${activityType}-partner-limit`}
            type="number"
            min={1}
            max={10}
            step={1}
            value={policy.maxPromotedPerPartner}
            onChange={(event) => onChange({ ...policy, maxPromotedPerPartner: Number(event.target.value) })}
          />
          <FieldDescription>Évite qu’un même compte occupe tous les emplacements.</FieldDescription>
        </Field>
      </CardContent>
    </Card>
  );
}
