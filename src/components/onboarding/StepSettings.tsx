"use client";

import { Button } from "@/components/ui/button";
import {
  RESTAURANT_TYPE_OPTIONS,
  SERVICE_TYPE_OPTIONS,
} from "@/lib/onboarding/settings";
import { Check, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { useState } from "react";
import type { RestaurantSettings } from "./types";

interface StepSettingsProps {
  data: RestaurantSettings;
  updateData: (fields: Partial<RestaurantSettings>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export default function StepSettings({
  data,
  updateData,
  onNext,
  onPrev,
}: StepSettingsProps) {
  const [error, setError] = useState<string | null>(null);

  const toggleServiceType = (
    type: (typeof SERVICE_TYPE_OPTIONS)[number]["id"],
  ) => {
    const serviceTypes = data.serviceTypes.includes(type)
      ? data.serviceTypes.filter((current) => current !== type)
      : [...data.serviceTypes, type];
    updateData({ serviceTypes });
    setError(null);
  };

  const validateAndProceed = () => {
    if (!data.category) {
      setError("Choisissez le type de votre établissement.");
      return;
    }
    if (data.serviceTypes.length === 0) {
      setError("Choisissez au moins un mode de service.");
      return;
    }
    setError(null);
    onNext();
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-6 lg:p-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-brand-500 ring-1 ring-emerald-100">
              <Settings className="size-5" aria-hidden="true" />
            </div>
            <span className="font-mono text-xs font-semibold tracking-wider text-gray-400 uppercase">
              Étape 5/6
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Fonctionnement de l’établissement
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Ces informations déterminent la présentation du restaurant et les
            modes de commande proposés aux clients.
          </p>
        </div>

        <div className="space-y-8 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-medium text-red-700"
            >
              {error}
            </p>
          ) : null}

          <fieldset>
            <legend className="text-sm font-bold text-gray-950">
              Type d’établissement
            </legend>
            <p className="mt-1 text-xs text-gray-500">
              Choisissez la description qui correspond le mieux à votre
              activité.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {RESTAURANT_TYPE_OPTIONS.map((category) => {
                const selected = data.category === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      updateData({ category: category.id });
                      setError(null);
                    }}
                    className={`relative rounded-2xl border p-4 text-left outline-none transition-all focus-visible:ring-3 focus-visible:ring-brand-500/20 ${
                      selected
                        ? "border-brand-500 bg-emerald-50/60 shadow-sm"
                        : "border-gray-150 bg-white hover:border-emerald-200 hover:bg-emerald-50/20"
                    }`}
                  >
                    {selected ? (
                      <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-brand-600 text-white">
                        <Check className="size-3.5" aria-hidden="true" />
                      </span>
                    ) : null}
                    <span className="block pr-6 text-sm font-bold text-gray-950">
                      {category.name}
                    </span>
                    <span className="mt-1.5 block text-[11px] leading-relaxed text-gray-500">
                      {category.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="border-t border-gray-100 pt-7">
            <legend className="text-sm font-bold text-gray-950">
              Modes de service
            </legend>
            <p className="mt-1 text-xs text-gray-500">
              Sélectionnez au moins un mode proposé par votre établissement.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {SERVICE_TYPE_OPTIONS.map((service) => {
                const selected = data.serviceTypes.includes(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleServiceType(service.id)}
                    className={`flex items-start gap-3 rounded-2xl border p-4 text-left outline-none transition-all focus-visible:ring-3 focus-visible:ring-brand-500/20 ${
                      selected
                        ? "border-brand-500 bg-emerald-50/60"
                        : "border-gray-150 hover:border-emerald-200"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border ${
                        selected
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      {selected ? (
                        <Check className="size-3.5" aria-hidden="true" />
                      ) : null}
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-gray-900">
                        {service.name}
                      </span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-gray-500">
                        {service.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-xs">
            <span className="text-gray-500">Devise de la plateforme</span>
            <span className="font-bold text-gray-900">Franc CFA (XOF)</span>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
          <Button type="button" variant="outline" size="lg" onClick={onPrev}>
            <ChevronLeft aria-hidden="true" />
            Retour
          </Button>
          <Button type="button" size="lg" onClick={validateAndProceed}>
            Continuer, aperçu
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
