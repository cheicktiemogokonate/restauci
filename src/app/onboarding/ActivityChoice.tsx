"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Building2, Check, Loader2, Store } from "lucide-react";
import { AppLogo } from "@/components/ui/app-logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { PartnerActivityType } from "@/modules/partners/model";
import { chooseActivityAction } from "./actions";

const activities = [
  {
    id: "restaurant" as const,
    name: "Restaurant",
    description: "Gérer une carte, recevoir des commandes et organiser les services du restaurant.",
    icon: Store,
  },
  {
    id: "residence" as const,
    name: "Résidence",
    description: "Présenter un ou plusieurs logements et gérer leur activité d’hébergement.",
    icon: Building2,
  },
];

export default function ActivityChoice() {
  const router = useRouter();
  const [selected, setSelected] = useState<PartnerActivityType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function continueOnboarding() {
    if (!selected) {
      setError("Choisissez l’activité que vous souhaitez gérer.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await chooseActivityAction(selected);
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.push(result.href);
      router.refresh();
    });
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <AppLogo href="/" alt="Toutci" iconSizeClassName="size-10" textSizeClassName="w-28" textVisibilityClassName="block" />
        <section className="mt-10 rounded-xl border bg-white p-5 sm:p-8">
          <p className="text-sm font-semibold text-emerald-700">Configuration du compte</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Quelle activité souhaitez-vous gérer ?
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
            Ce choix adapte votre espace partenaire et son onboarding. Pour le MVP, un compte reste associé à une seule activité.
          </p>

          {error ? <Alert variant="destructive" className="mt-6"><AlertDescription>{error}</AlertDescription></Alert> : null}

          <div className="mt-7 space-y-3" role="radiogroup" aria-label="Activité du compte partenaire">
            {activities.map((activity) => {
              const Icon = activity.icon;
              const isSelected = selected === activity.id;
              return (
                <button
                  key={activity.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => { setSelected(activity.id); setError(null); }}
                  disabled={isPending}
                  className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-60 ${isSelected ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                >
                  <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${isSelected ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600"}`}><Icon className="size-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block font-semibold text-slate-950">{activity.name}</span><span className="mt-1 block text-sm leading-5 text-slate-600">{activity.description}</span></span>
                  <span className={`mt-2 flex size-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 text-transparent"}`}><Check className="size-3" /></span>
                </button>
              );
            })}
          </div>

          <div className="mt-7 flex justify-end">
            <Button onClick={continueOnboarding} disabled={!selected || isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : null}
              Continuer
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
