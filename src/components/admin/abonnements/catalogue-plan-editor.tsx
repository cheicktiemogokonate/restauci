"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { SubscriptionCataloguePayload } from "@/modules/subscriptions/contracts";

type ActivityType = "restaurant" | "residence";
type Plan = SubscriptionCataloguePayload["plans"][number];

function NumberField({
  id,
  label,
  value,
  min = 0,
  max,
  step = 1,
  suffix,
  description,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  description?: string;
  onChange: (value: number) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix ? <span className="shrink-0 text-sm text-muted-foreground">{suffix}</span> : null}
      </div>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
}

function LimitField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="number"
        min={0}
        step={1}
        placeholder="Illimité"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))}
      />
    </Field>
  );
}

function CapabilitySwitch({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function CataloguePlanEditor({
  plan,
  activityType,
  onChange,
}: {
  plan: Plan;
  activityType: ActivityType;
  onChange: (plan: Plan) => void;
}) {
  const presentation = plan.presentation[activityType];
  const isDiscovery = plan.code === "decouverte";

  const updatePresentation = (updates: Partial<typeof presentation>) => {
    onChange({
      ...plan,
      presentation: {
        ...plan.presentation,
        [activityType]: { ...presentation, ...updates },
      },
    });
  };

  const updateFeature = (index: number, label: string) => {
    const features = [...presentation.features];
    features[index] = label;
    updatePresentation({ features });
  };

  const moveFeature = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= presentation.features.length) return;
    const features = [...presentation.features];
    [features[index], features[target]] = [features[target], features[index]];
    updatePresentation({ features });
  };

  const removeFeature = (index: number) => {
    updatePresentation({ features: presentation.features.filter((_, candidate) => candidate !== index) });
  };

  return (
    <Card className={presentation.recommended ? "border-primary/35 shadow-none ring-1 ring-primary/10" : "shadow-none"}>
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{plan.code.replaceAll("_", " ")}</Badge>
              {presentation.recommended ? <Badge>Recommandée</Badge> : null}
            </div>
            <CardTitle>{plan.nom}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Active</span>
            <Switch
              checked={plan.actif}
              aria-label={`Activer l’offre ${plan.nom}`}
              onCheckedChange={(actif) => onChange({ ...plan, actif })}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-5">
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">Identité commerciale</h3>
            <p className="text-xs text-muted-foreground">Commune à Restaurant et Résidence.</p>
          </div>
          <Field>
            <FieldLabel htmlFor={`${plan.code}-name-${activityType}`}>Nom</FieldLabel>
            <Input
              id={`${plan.code}-name-${activityType}`}
              value={plan.nom}
              onChange={(event) => onChange({ ...plan, nom: event.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${plan.code}-description-${activityType}`}>Description</FieldLabel>
            <Textarea
              id={`${plan.code}-description-${activityType}`}
              rows={3}
              value={plan.description ?? ""}
              onChange={(event) => onChange({ ...plan, description: event.target.value || null })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-1 min-[1800px]:grid-cols-2">
            <NumberField
              id={`${plan.code}-price-${activityType}`}
              label="Prix annuel"
              suffix="FCFA"
              value={plan.prixAnnuelFcfa}
              onChange={(prixAnnuelFcfa) => onChange({ ...plan, prixAnnuelFcfa })}
            />
            <NumberField
              id={`${plan.code}-commission-${activityType}`}
              label="Commission"
              suffix="%"
              min={0}
              max={100}
              step={0.01}
              value={plan.tauxCommissionBps / 100}
              onChange={(value) => onChange({ ...plan, tauxCommissionBps: Math.round(value * 100) })}
            />
            <NumberField
              id={`${plan.code}-order-${activityType}`}
              label="Ordre d’affichage"
              value={plan.ordre}
              onChange={(ordre) => onChange({ ...plan, ordre })}
            />
          </div>
        </section>

        <section className="space-y-4 border-t pt-5">
          <div>
            <h3 className="text-sm font-semibold">Quota {activityType === "restaurant" ? "Restaurant" : "Résidence"}</h3>
            <p className="text-xs text-muted-foreground">Une valeur vide signifie « illimité ».</p>
          </div>
          {activityType === "restaurant" ? (
            <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-1 min-[1800px]:grid-cols-2">
              <LimitField
                id={`${plan.code}-dish-limit`}
                label="Plats maximum"
                value={plan.restaurantLimits.dish}
                onChange={(dish) => onChange({ ...plan, restaurantLimits: { ...plan.restaurantLimits, dish } })}
              />
              <LimitField
                id={`${plan.code}-category-limit`}
                label="Catégories maximum"
                value={plan.restaurantLimits.category}
                onChange={(category) => onChange({ ...plan, restaurantLimits: { ...plan.restaurantLimits, category } })}
              />
            </div>
          ) : (
            <LimitField
              id={`${plan.code}-residence-limit`}
              label="Résidences visibles maximum"
              value={plan.residenceLimits.residence}
              onChange={(residence) => onChange({ ...plan, residenceLimits: { residence } })}
            />
          )}
        </section>

        <section className="space-y-4 border-t pt-5">
          <div>
            <h3 className="text-sm font-semibold">Exposition {activityType === "restaurant" ? "Restaurant" : "Résidence"}</h3>
            <p className="text-xs text-muted-foreground">Avantages appliqués en direct à tous les comptes de l’offre.</p>
          </div>
          <NumberField
            id={`${plan.code}-weight-${activityType}`}
            label="Poids de rotation"
            min={1}
            max={100}
            value={presentation.exposureWeight}
            description="Doit rester strictement inférieur à l’offre suivante."
            onChange={(exposureWeight) => updatePresentation({ exposureWeight })}
          />
          <CapabilitySwitch
            label="Résultats mis en avant"
            description="Éligible aux emplacements sponsorisés dans la recherche."
            checked={presentation.searchPromotedEligible}
            disabled={isDiscovery}
            onCheckedChange={(searchPromotedEligible) => updatePresentation({ searchPromotedEligible })}
          />
          <CapabilitySwitch
            label="Mise en avant dans la zone"
            description="Peut apparaître dans une sélection locale dédiée."
            checked={presentation.marketFeaturedEligible}
            disabled={isDiscovery}
            onCheckedChange={(marketFeaturedEligible) => updatePresentation({ marketFeaturedEligible })}
          />
          <CapabilitySwitch
            label="Mise en avant sur l’accueil"
            description="Peut intégrer les sélections de la page d’accueil."
            checked={presentation.homepageFeaturedEligible}
            disabled={isDiscovery}
            onCheckedChange={(homepageFeaturedEligible) => updatePresentation({ homepageFeaturedEligible })}
          />
          <CapabilitySwitch
            label="Badge partenaire"
            description="Affiche le badge commercial associé à l’offre."
            checked={presentation.partnerBadgeEnabled}
            disabled={isDiscovery}
            onCheckedChange={(partnerBadgeEnabled) => updatePresentation({ partnerBadgeEnabled })}
          />
          <CapabilitySwitch
            label="Offre recommandée"
            description="Une seule offre peut être recommandée par activité."
            checked={presentation.recommended}
            onCheckedChange={(recommended) => updatePresentation({ recommended })}
          />
          <Field>
            <FieldLabel htmlFor={`${plan.code}-cta-${activityType}`}>Texte du bouton</FieldLabel>
            <Input
              id={`${plan.code}-cta-${activityType}`}
              value={presentation.ctaLabel}
              onChange={(event) => updatePresentation({ ctaLabel: event.target.value })}
            />
          </Field>
        </section>

        <section className="space-y-4 border-t pt-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Avantages affichés</h3>
              <p className="text-xs text-muted-foreground">Ordre utilisé dans les cartes d’abonnement.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={presentation.features.length >= 12}
              onClick={() => updatePresentation({ features: [...presentation.features, "Nouvel avantage"] })}
            >
              <Plus data-icon="inline-start" /> Ajouter
            </Button>
          </div>

          <div className="space-y-2">
            {presentation.features.map((feature, index) => (
              <div key={`${plan.code}-${activityType}-${index}`} className="flex items-center gap-1.5">
                <Input
                  aria-label={`Avantage ${index + 1}`}
                  value={feature}
                  onChange={(event) => updateFeature(index, event.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Monter l’avantage"
                  disabled={index === 0}
                  onClick={() => moveFeature(index, -1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Descendre l’avantage"
                  disabled={index === presentation.features.length - 1}
                  onClick={() => moveFeature(index, 1)}
                >
                  <ArrowDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Supprimer l’avantage"
                  onClick={() => removeFeature(index)}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
