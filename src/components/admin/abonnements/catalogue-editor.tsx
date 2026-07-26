"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { updateSubscriptionPlan } from "@/lib/actions/admin-subscriptions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/motion/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatefulButton } from "@/components/motion/stateful-button";
import { Switch } from "@/components/motion/switch";

interface Plan {
  id: string;
  code: string;
  nom: string;
  description: string | null;
  prixAnnuelFcfa: number;
  tauxCommissionBps: number;
  maxPlats: number | null;
  maxCategories: number | null;
  actif: boolean;
}

type PlanForm = {
  nom: string;
  description: string;
  prixAnnuelFcfa: string;
  tauxCommission: string;
  maxPlats: string;
  maxCategories: string;
};

function toForm(plan: Plan): PlanForm {
  return {
    nom: plan.nom,
    description: plan.description ?? "",
    prixAnnuelFcfa: String(plan.prixAnnuelFcfa),
    tauxCommission: String(plan.tauxCommissionBps / 100),
    maxPlats: plan.maxPlats === null ? "" : String(plan.maxPlats),
    maxCategories: plan.maxCategories === null ? "" : String(plan.maxCategories),
  };
}

function positiveInteger(value: string, label: string, allowZero = true) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < (allowZero ? 0 : 1)) {
    throw new Error(`${label} doit être un nombre entier valide`);
  }
  return number;
}

export function CatalogueEditor({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const [forms, setForms] = useState<Record<string, PlanForm>>(
    () => Object.fromEntries(plans.map((plan) => [plan.code, toForm(plan)]))
  );
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [activeByCode, setActiveByCode] = useState<Record<string, boolean>>(
    () => Object.fromEntries(plans.map((plan) => [plan.code, plan.actif])),
  );

  const updateField = (code: string, field: keyof PlanForm, value: string) => {
    setForms((current) => ({ ...current, [code]: { ...current[code], [field]: value } }));
  };

  const save = async (plan: Plan) => {
    const form = forms[plan.code];
    if (!form.nom.trim()) {
      toast.error("Le nom de l'offre est obligatoire");
      return;
    }

    setSavingCode(plan.code);
    try {
      const taux = Number(form.tauxCommission.replace(",", "."));
      if (!Number.isFinite(taux) || taux < 0 || taux > 100) {
        throw new Error("Le taux de commission doit être compris entre 0 et 100 %");
      }

      await updateSubscriptionPlan(plan.code, {
        nom: form.nom.trim(),
        description: form.description.trim() || null,
        prixAnnuelFcfa: positiveInteger(form.prixAnnuelFcfa, "Le prix annuel"),
        tauxCommissionBps: Math.round(taux * 100),
        maxPlats: form.maxPlats.trim() === "" ? null : positiveInteger(form.maxPlats, "La limite de plats", false),
        maxCategories: form.maxCategories.trim() === "" ? null : positiveInteger(form.maxCategories, "La limite de catégories", false),
        actif: activeByCode[plan.code],
      });
      toast.success(`L'offre ${form.nom.trim()} a été mise à jour`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer l'offre");
    } finally {
      setSavingCode(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        Les changements de taux s&apos;appliquent uniquement aux futures commandes servies. Les commissions existantes restent inchangées.
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {plans.map((plan) => {
          const form = forms[plan.code];
          return (
            <Card key={plan.id} className="shadow-none">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{plan.nom}</CardTitle>
                    <CardDescription className="mt-1">Paramètres de l&apos;offre</CardDescription>
                  </div>
                  <Switch
                    checked={activeByCode[plan.code]}
                    disabled={savingCode === plan.code}
                    onCheckedChange={(checked) =>
                      setActiveByCode((current) => ({
                        ...current,
                        [plan.code]: checked,
                      }))
                    }
                    label={activeByCode[plan.code] ? "Active" : "Inactive"}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${plan.code}-nom`}>Nom</Label>
                  <Input id={`${plan.code}-nom`} value={form.nom} onChange={(value) => updateField(plan.code, "nom", value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${plan.code}-description`}>Description</Label>
                  <Textarea id={`${plan.code}-description`} value={form.description} onChange={(event) => updateField(plan.code, "description", event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${plan.code}-prix`}>Prix annuel (FCFA)</Label>
                  <Input id={`${plan.code}-prix`} inputMode="numeric" value={form.prixAnnuelFcfa} onChange={(value) => updateField(plan.code, "prixAnnuelFcfa", value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${plan.code}-taux`}>Taux de commission (%)</Label>
                  <Input id={`${plan.code}-taux`} inputMode="decimal" value={form.tauxCommission} onChange={(value) => updateField(plan.code, "tauxCommission", value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor={`${plan.code}-plats`}>Max. plats</Label>
                    <Input id={`${plan.code}-plats`} inputMode="numeric" placeholder="Illimité" value={form.maxPlats} onChange={(value) => updateField(plan.code, "maxPlats", value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`${plan.code}-categories`}>Max. catégories</Label>
                    <Input id={`${plan.code}-categories`} inputMode="numeric" placeholder="Illimité" value={form.maxCategories} onChange={(value) => updateField(plan.code, "maxCategories", value)} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Laissez une limite vide pour rendre l&apos;offre illimitée.</p>
                <StatefulButton
                  className="w-full rounded-lg"
                  onClick={() => save(plan)}
                  state={savingCode === plan.code ? "loading" : "idle"}
                  loadingText="Enregistrement…"
                >
                  Enregistrer
                </StatefulButton>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
